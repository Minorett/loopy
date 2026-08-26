/**********************************

NIRA!
- Network InteRvention Analysis (Lite, Fase 1)

Algoritmo de identificación de mejores dianas de intervención,
100% client-side. Recorre la red, mide el impacto de intervenir
cada nodo contra una línea base de control y devuelve un ranking.

Parámetros fijos (Fase 1, auditados):
  - Intensidad:     +1 (solo a la alta)
  - Umbral:         0.001 (Σ|Δvalue| entre ticks)
  - Ticks estables: 5
  - Tope de ticks:  2000

Junto a Loopy/Model/Node/Edge expone una API global `NIRA`.

**********************************/

var NIRA = {

    // Parámetros fijos Fase 1 (sin UI)
    MAX_TICKS:         2000, // tope de ticks por simulación
    THRESHOLD:         0.001, // umbral de estabilidad
    MIN_STABLE_TICKS:  5,     // ticks consecutivos bajo el umbral
    INTENSITY:         1,     // intervención: +1 a la alta

    // Estado de ejecución / antirreentrada
    running: false,

    // Array reusado para el estado previo (minimiza allocations/GC)
    _prevValues: null,

    // Tamaño de cada rebanada asíncrona (ticks por setTimeout(0))
    CHUNK_TICKS: 200
};

//////////////////////////////////////
// TOTAL SCORE ///////////////////////
//////////////////////////////////////

// Puntaje total del sistema = suma de values de todos los nodos.
NIRA.totalScore = function(model){
    var nodes = model.nodes;
    var sum = 0;
    for(var i=0;i<nodes.length;i++){
        sum += nodes[i].value;
    }
    return sum;
};

//////////////////////////////////////
// SNAPSHOT / RESTORE ////////////////
//////////////////////////////////////

// Snapshot propio: NO usa Model.serialize/deserialize
// (no preservan value ni signals, y deserialize mata/recrea objetos).
// Guarda valores por nodo + copia profunda de señales por borde.
NIRA.snapshot = function(loopy){
    var model = loopy.model;
    var snap = {
        mode: loopy.mode,
        signalSpeed: loopy.signalSpeed,
        nodeValues: [],
        nodeCount: model.nodes.length,
        edgeCount: model.edges.length,
        edgeSignals: []
    };
    for(var i=0;i<model.nodes.length;i++){
        snap.nodeValues.push(model.nodes[i].value);
    }
    for(var i=0;i<model.edges.length;i++){
        var edge = model.edges[i];
        var signals = [];
        for(var j=0;j<edge.signals.length;j++){
            var s = edge.signals[j];
            signals.push({
                delta: s.delta,
                position: s.position,
                scaleX: s.scaleX,
                scaleY: s.scaleY,
                age: s.age
            });
        }
        snap.edgeSignals.push(signals);
    }
    return snap;
};

// Restaura values + edge.signals + reconstruye Edge.allSignals + mode.
// No publica "model/changed" (evita autosave). Publica "view/changed"
// para forzar un redibujado sin marcar el modelo como sucio.
NIRA.restore = function(loopy, snap){
    var model = loopy.model;
    var n = Math.min(model.nodes.length, snap.nodeValues.length);
    for(var i=0;i<n;i++){
        model.nodes[i].value = snap.nodeValues[i];
    }
    Edge.allSignals = [];
    var e = Math.min(model.edges.length, snap.edgeSignals.length);
    for(var i=0;i<e;i++){
        var edge = model.edges[i];
        var signals = snap.edgeSignals[i].slice(); // copia superficial del array
        edge.signals = signals;
        for(var j=0;j<signals.length;j++){
            Edge.allSignals.push(signals[j]);
        }
    }
    loopy.mode = snap.mode;
    loopy.signalSpeed = snap.signalSpeed;
    publish("view/changed");
};

//////////////////////////////////////
// SIMULACIÓN HASTA ESTABILIDAD //////
//////////////////////////////////////

// Corre model.update() hasta que la Σ|Δvalue| entre ticks quede
// < threshold durante minStableTicks seguidos Y no queden señales en
// vuelo (Edge.allSignals vacío), o hasta alcanzar maxTicks.
// Devuelve nº de ticks usados.
//
// El requisito de señales en vuelo vacías evita la falsa convergencia:
// una señal en tránsito aún no ha cambiado valores, por lo que los
// primeros ticks tras intervenir pueden parecer "estables" antes de
// que la señal aterrice y propague. Solo cuando no queda ninguna señal
// pendiente el estado es un punto realmente estable.
//
// Nota: requiere loopy.mode == MODE_PLAY (en EDIT, Node.update fuerza
// value=init en cada tick).
NIRA.runSimulationUntilStable = function(loopy, maxTicks, threshold, minStableTicks){
    threshold = (threshold===undefined) ? NIRA.THRESHOLD : threshold;
    minStableTicks = (minStableTicks===undefined) ? NIRA.MIN_STABLE_TICKS : minStableTicks;

    var model = loopy.model;
    var nodes = model.nodes;
    var n = nodes.length;

    // Array reusado para el estado previo.
    var prev = NIRA._prevValues;
    if(!prev || prev.length < n) prev = NIRA._prevValues = new Array(n);

    var stable = 0;
    var t;
    for(t=0; t<maxTicks; t++){
        model.update();
        if(t === 0){
            for(var i=0;i<n;i++) prev[i] = nodes[i].value;
            continue;
        }
        var change = 0;
        for(var i=0;i<n;i++){
            change += Math.abs(nodes[i].value - prev[i]);
            prev[i] = nodes[i].value;
        }
        if(change < threshold && Edge.allSignals.length === 0){
            stable++;
            if(stable >= minStableTicks) return t+1;
        }else{
            stable = 0;
        }
    }
    return maxTicks;
};

//////////////////////////////////////
// ANÁLISIS (NIRA LITE) //////////////
//////////////////////////////////////

// Ejecuta el análisis completo en rebanadas asíncronas:
//   0) Simulación de CONTROL sin intervenir -> puntaje línea base.
//   1..N) Por nodo: restaurar snapshot -> +1 en ese nodo ->
//          simular -> puntaje -> impacto = puntaje - línea base.
// Al final restaura el snapshot completo (modo incluido).
//
// options:
//   onProgress(p)  p en 0..1
//   onComplete(results)  results: [{node,label,impact,impactNormalized,ticks}] desc
//   onError(msg)
NIRA.analyze = function(loopy, options){
    options = options || {};
    var onProgress   = options.onProgress   || function(){};
    var onComplete   = options.onComplete   || function(){};
    var onError      = options.onError      || function(){};

    if(NIRA.running) return; // antirreentrada: no correr dos análisis a la vez
    var model = loopy.model;
    if(!model || model.nodes.length === 0){
        onError("No hay nodos en la red para analizar.");
        return;
    }

    NIRA.running = true;

    // Durante el análisis la simulación debe comportarse como PLAY:
    // en modo EDIT, Node.update fuerza value=init en cada tick.
    // Se asigna loopy.mode directamente (sin setMode, que publica y
    // cambiaría el playbar); al final se restaura el modo original.
    var prevMode = loopy.mode;
    loopy.mode = Loopy.MODE_PLAY;
    loopy._niraRunning = true;

    // Bloquear edición/clics sobre barra de herramientas, playbar y sidebar
    // durante el análisis (además del flag _niraRunning en Node.js).
    var _blocked = [];
    var _blockEls = [loopy.toolbar?loopy.toolbar.dom:null,
                     loopy.playbar?loopy.playbar.dom:null,
                     loopy.sidebar?loopy.sidebar.dom:null];
    for(var _b=0;_b<_blockEls.length;_b++){
        if(_blockEls[_b]){
            _blocked.push([_blockEls[_b], _blockEls[_b].style.pointerEvents]);
            _blockEls[_b].style.pointerEvents = "none";
        }
    }

    // Snapshot del estado del usuario (se restaura al finalizar).
    var snap = NIRA.snapshot(loopy);
    var nodes = model.nodes;
    var totalTasks = nodes.length + 1; // control + 1 por nodo
    var taskIndex = 0;     // 0 = control, k>0 = nodo k-1
    var taskTicksDone = 0; // ticks consumidos en la tarea actual
    var baseScore = 0;
    var results = [];
    var aborted = false;

    var _cleanup = function(){
        // Devuelve la UI bloqueada.
        for(var i=0;i<_blocked.length;i++){
            _blocked[i][0].style.pointerEvents = _blocked[i][1] || "";
        }
        loopy._niraRunning = false;
        NIRA.running = false;
    };

    var _integrityOK = function(){
        return (model.nodes.length === snap.nodeCount) &&
               (model.edges.length === snap.edgeCount);
    };

    var _finishTask = function(){
        if(!_integrityOK()){
            aborted = true;
            NIRA._resetSimState();
            NIRA.restore(loopy, snap);
            loopy.mode = prevMode;
            _cleanup();
            onError("La red cambió durante el análisis. Intenta de nuevo.");
            return;
        }
        if(taskIndex === 0){
            // Tarea de control
            baseScore = NIRA.totalScore(model);
        }else{
            // Tarea de intervención sobre nodo taskIndex-1
            var node = nodes[taskIndex-1];
            var score = NIRA.totalScore(model);
            var impact = score - baseScore;
            results.push({
                node: node,
                label: node.label,
                impact: impact,
                impactNormalized: 0, // se normaliza en _finishAll
                ticks: taskTicksDone
            });
        }
        // Restaurar snapshot para que cada intervención parta del mismo estado
        NIRA._resetSimState();
        NIRA.restore(loopy, snap);
        loopy.mode = Loopy.MODE_PLAY; // re-afirmar modo simulación entre tareas
    };

    var _finishAll = function(){
        // Normalizar impacto a 0..1 (robusto a saltos numéricos / explosión:
        // si un impacto se desborda a Infinity, el ratio puede dar NaN).
        var maxAbs = 0;
        for(var i=0;i<results.length;i++){
            var a = Math.abs(results[i].impact);
            if(isFinite(a) && a > maxAbs) maxAbs = a;
        }
        for(var i=0;i<results.length;i++){
            var imp = results[i].impact;
            var norm;
            if(!isFinite(imp)){
                norm = (imp > 0) ? 1 : 0; // explosión: saturar
            }else if(maxAbs > 0){
                norm = imp / maxAbs;
            }else{
                norm = 0;
            }
            norm = norm < 0 ? 0 : (norm > 1 ? 1 : norm);
            if(isNaN(norm)) norm = 0;
            results[i].impactNormalized = norm;
            results[i].node.impact = norm;
        }
        results.sort(function(a,b){ return b.impact - a.impact; });

        // Restaurar snapshot completo (valores/signales/modo) del usuario.
        NIRA._resetSimState();
        NIRA.restore(loopy, snap);
        loopy.mode = prevMode;
        loopy.showImpact = true; // pintar auras
        _cleanup();
        onComplete(results);
    };

    var _resetBeforeTask = function(){
        // Cada tarea parte del snapshot limpio.
        taskTicksDone = 0;
    };

    var step = function(){
        if(aborted) return;

        var budget = NIRA.MAX_TICKS - 0; // tope por tarea
        var remaining = budget - taskTicksDone;
        if(remaining <= 0){
            // Tarea consumió todo el presupuesto -> medir
            _finishTask();
            taskIndex++;
            if(taskIndex > totalTasks - 1){
                _finishAll();
                return;
            }
            _resetBeforeTask();
            _prepareIntervention(); // intervenir el nuevo nodo
            setTimeout(step, 0);
            return;
        }

        var batch = Math.min(NIRA.CHUNK_TICKS, remaining);
        var used = NIRA.runSimulationUntilStable(loopy, batch, NIRA.THRESHOLD, NIRA.MIN_STABLE_TICKS);
        taskTicksDone += used;

        // Progreso: tareas completadas + fracción de la tarea actual
        var progress = (taskIndex + (taskTicksDone / budget)) / totalTasks;
        onProgress(progress < 1 ? progress : 1);

        if(used < batch){
            // Convergió dentro de esta rebanada
            _finishTask();
            taskIndex++;
            if(taskIndex > totalTasks - 1){
                _finishAll();
                return;
            }
            _resetBeforeTask();
            _prepareIntervention();
        }
        setTimeout(step, 0);
    };

    var _prepareIntervention = function(){
        if(taskIndex === 0) return; // la tarea de control no interviene
        var node = nodes[taskIndex-1];
        // Intervenir subiendo +1: takeSignal hace value += delta Y re-emite
        // propagación (subir solo value no propaga nada).
        node.takeSignal({ delta: NIRA.INTENSITY });
    };

    // ---- Arranque ----
    _resetBeforeTask();
    setTimeout(step, 0);
};

// Limpia el array reusado de estado previo entre tareas/simulaciones para
// que el primer tick de cada tarea se considere "sin referencia".
NIRA._resetSimState = function(){
    NIRA._prevValues = null;
};
