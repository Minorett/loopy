/**********************************

LOOPY!
- with edit & play mode

**********************************/

Loopy.MODE_EDIT = 0;
Loopy.MODE_PLAY = 1;

Loopy.TOOL_INK = 0;
Loopy.TOOL_DRAG = 1;
Loopy.TOOL_ERASE = 2;
Loopy.TOOL_LABEL = 3;

function Loopy(config){

    var self = this;
    self.config = config;

    // Loopy: EMBED???
    self.embedded = _getParameterByName("embed");
    self.embedded = !!parseInt(self.embedded); // force to Boolean

    // Offset & Scale?!?!
    self.offsetX = 0;
    self.offsetY = 0;
    self.offsetScale = 1;

    // Mouse
    Mouse.init(document.getElementById("canvasses")); // TODO: ugly fix, ew
    
    // Model
    self.model = new Model(self);

    // Loopy: SPEED!
    self.signalSpeed = 3;

    // Sidebar
    self.sidebar = new Sidebar(self);
    self.sidebar.showPage("Edit"); // start here

    // Play/Edit mode
    self.mode = Loopy.MODE_EDIT;

    // Centrality
    self.showCentrality = false;

    // Tools
    self.toolbar = new Toolbar(self);
    self.tool = Loopy.TOOL_INK;
    self.ink = new Ink(self);
    self.drag = new Dragger(self);
    self.erase = new Eraser(self);
    self.label = new Labeller(self);

    // Play Controls
    self.playbar = new PlayControls(self);
    self.playbar.showPage("Editor"); // start here

    // Modal
    self.modal = new Modal(self);

    //////////
    // INIT //
    //////////

    self.init = function(){
        self.loadFromURL(); // try it.
    };

    ///////////////////
    // UPDATE & DRAW //
    ///////////////////

    // Update
    self.update = function(){
        Mouse.update();
        if(self.wobbleControls>=0) self.wobbleControls--; // wobble
        if(!self.modal.isShowing){ // modAl
            self.model.update(); // modEl
        }
    };
    setInterval(self.update, 1000/30); // 30 FPS, why not.

    // Draw
    self.draw = function(){
        if(!self.modal.isShowing){ // modAl
            self.model.draw(); // modEl
        }
        requestAnimationFrame(self.draw);
    };

    // TODO: Smarter drawing of Ink, Edges, and Nodes
    // (only Nodes need redrawing often. And only in PLAY mode.)

    //////////////////////
    // PLAY & EDIT MODE //
    //////////////////////

    self.showPlayTutorial = false;
    self.wobbleControls = -1;
    self.setMode = function(mode){

        self.mode = mode;
        publish("loopy/mode");

        // Play mode!
        if(mode==Loopy.MODE_PLAY){
            self.showPlayTutorial = true; // show once!
            if(!self.embedded) self.wobbleControls=45; // only if NOT embedded
            self.sidebar.showPage("Edit");
            self.playbar.showPage("Player");
            self.sidebar.dom.setAttribute("mode","play");
            self.toolbar.dom.setAttribute("mode","play");
            document.getElementById("canvasses").removeAttribute("cursor"); // TODO: EVENT BASED
        }else{
            publish("model/reset");
        }

        // Edit mode!
        if(mode==Loopy.MODE_EDIT){
            self.showPlayTutorial = false; // donezo
            self.wobbleControls = -1; // donezo
            self.sidebar.showPage("Edit");
            self.playbar.showPage("Editor");
            self.sidebar.dom.setAttribute("mode","edit");
            self.toolbar.dom.setAttribute("mode","edit");
            document.getElementById("canvasses").setAttribute("cursor", self.toolbar.currentTool); // TODO: EVENT BASED
        }

    };

    /////////////////
    // SAVE & LOAD //
    /////////////////

    self.dirty = false;

    // YOU'RE A DIRTY BOY
    subscribe("model/changed", function(){
        if(!self.embedded) self.dirty = true;
    });

    subscribe("export/file", function(){
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + self.model.serialize());
        element.setAttribute('download', "system_model.loopy");

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    });

    subscribe("save/png", function(){
        var modelCanvas = self.model.canvas;
        var inkCanvas = self.ink.canvas;
        
        // Create a temporary canvas for compositing
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = modelCanvas.width;
        tempCanvas.height = modelCanvas.height;
        var tempCtx = tempCanvas.getContext('2d');
        
        // 1. Fill with white background
        tempCtx.fillStyle = "#fff";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // 2. Draw the model (and ink) on top
        tempCtx.drawImage(modelCanvas, 0, 0);
        tempCtx.drawImage(inkCanvas, 0, 0);

        // 3. Draw the analysis grid if it's visible
        var gridOverlay = document.getElementById('grid-overlay');
        if (gridOverlay && gridOverlay.classList.contains('show')) {
            var canvasWidth = tempCanvas.width;
            var canvasHeight = tempCanvas.height;
            var cellWidth = canvasWidth / 3;
            var cellHeight = canvasHeight / 3;
            
            // Grid labels based on the HTML structure
            var gridLabels = [
                'Atención', 'Cognición', 'Self',
                'Afecto', 'Conducta', 'Motivación',
                'Biofisiológico', 'Contexto', 'Sociocultural'
            ];
            
            // Draw grid lines
            tempCtx.strokeStyle = '#cccccc';
            tempCtx.lineWidth = 1;
            tempCtx.setLineDash([5, 5]);
            
            // Vertical lines
            for (var i = 1; i < 3; i++) {
                tempCtx.beginPath();
                tempCtx.moveTo(i * cellWidth, 0);
                tempCtx.lineTo(i * cellWidth, canvasHeight);
                tempCtx.stroke();
            }
            
            // Horizontal lines
            for (var i = 1; i < 3; i++) {
                tempCtx.beginPath();
                tempCtx.moveTo(0, i * cellHeight);
                tempCtx.lineTo(canvasWidth, i * cellHeight);
                tempCtx.stroke();
            }
            
            tempCtx.setLineDash([]);
            
            // Draw labels
            tempCtx.font = "bold 24px 'Figtree', sans-serif";
            tempCtx.textAlign = "center";
            tempCtx.textBaseline = "middle";
            tempCtx.fillStyle = "rgba(136, 136, 136, 0.5)";
            
            for (var row = 0; row < 3; row++) {
                for (var col = 0; col < 3; col++) {
                    var label = gridLabels[row * 3 + col];
                    var x = cellWidth * col + cellWidth / 2;
                    var y = cellHeight * row + cellHeight / 2;
                    tempCtx.fillText(label, x, y);
                }
            }
        }

        // 4. Trigger download
        var link = document.createElement('a');
        link.setAttribute('download', "system_model.png");
        link.setAttribute('href', tempCanvas.toDataURL("image/png"));
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Save short link handler
    subscribe("save/short", function(){
        var modelData = self.model.serialize();
        
        // Show loading modal
        self.modal.showHTML(
            '<div style="text-align:center;padding:20px;font-family:\'Figtree\',sans-serif">' +
            '<div style="font-size:24px;font-weight:bold;margin-bottom:15px;">Generando Link...</div>' +
            '<div style="font-size:18px;color:#666;">Por favor espera</div>' +
            '</div>',
            400,
            150
        );
        
        // Send to save.php
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'save.php?action=save', true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response.success && response.shortUrl) {
                            self.modal.showHTML(
                                '<div style="text-align:center;padding:20px;font-family:\'Figtree\',sans-serif">' +
                                '<div style="font-size:22px;font-weight:bold;margin-bottom:20px;">¡Link Generado!</div>' +
                                '<div style="font-size:20px;margin-bottom:20px;word-break:break-all;color:#333;">' + response.shortUrl + '</div>' +
                                '<button id="copy-short-btn" onclick="copyShortLink(\'' + response.shortUrl + '\', this)" style="padding:12px 24px;font-size:16px;cursor:pointer;background:#2196F3;color:white;border:none;border-radius:6px;transition:background-color 0.3s ease;">Copiar link</button>' +
                                '</div>',
                                450,
                                220
                            );
                        } else {
                            self.modal.showHTML(
                                '<div style="text-align:center;padding:20px;font-family:\'Figtree\',sans-serif">' +
                                '<div style="font-size:22px;font-weight:bold;margin-bottom:20px;color:#d32f2f;">Error</div>' +
                                '<div style="font-size:16px;color:#666;margin-bottom:20px;">' + (response.error || 'Error desconocido') + '</div>' +
                                '<button onclick="loopy.modal.hide()" style="padding:12px 24px;font-size:16px;cursor:pointer;background:#666;color:white;border:none;border-radius:6px;">Cerrar</button>' +
                                '</div>',
                                400,
                                180
                            );
                        }
                    } catch (e) {
                        self.modal.showHTML(
                            '<div style="text-align:center;padding:20px;font-family:\'Figtree\',sans-serif">' +
                            '<div style="font-size:22px;font-weight:bold;margin-bottom:20px;color:#d32f2f;">Error</div>' +
                            '<div style="font-size:16px;color:#666;margin-bottom:20px;">Error al procesar la respuesta del servidor</div>' +
                            '<button onclick="loopy.modal.hide()" style="padding:12px 24px;font-size:16px;cursor:pointer;background:#666;color:white;border:none;border-radius:6px;">Cerrar</button>' +
                            '</div>',
                            400,
                            180
                        );
                    }
                } else {
                    self.modal.showHTML(
                        '<div style="text-align:center;padding:20px;font-family:\'Figtree\',sans-serif">' +
                        '<div style="font-size:22px;font-weight:bold;margin-bottom:20px;color:#d32f2f;">Error</div>' +
                        '<div style="font-size:16px;color:#666;margin-bottom:20px;">Error del servidor (HTTP ' + xhr.status + ')</div>' +
                        '<button onclick="loopy.modal.hide()" style="padding:12px 24px;font-size:16px;cursor:pointer;background:#666;color:white;border:none;border-radius:6px;">Cerrar</button>' +
                        '</div>',
                        400,
                        180
                    );
                }
            }
        };
        
        xhr.send(JSON.stringify({ model: modelData }));
    });

    subscribe("import/file", function(){
        let input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            var file = e.target.files[0];
            var reader = new FileReader();
            reader.readAsText(file,'UTF-8');
            reader.onload = readerEvent => {
                var content = readerEvent.target.result;
                self.model.deserialize(content);
            }
        };
        input.click();
    });

    self.saveToURL = function(embed){

        // Create link
        var dataString = self.model.serialize();
        var uri = dataString; // encodeURIComponent(dataString);
        var base = window.location.origin + window.location.pathname;
        var historyLink = base+"?data="+uri;
        var link;
        if(embed){
            link = base+"?embed=1&data="+uri;
        }else{
            link = historyLink;
        }

        // NO LONGER DIRTY!
        self.dirty = false;

        // PUSH TO HISTORY
        window.history.replaceState(null, null, historyLink);

        return link;
    };
    
    // "BLANK START" DATA:
    var _blankData = "[[[1,459,609,0,%22Ansiedad%22,4],[2,293,773,0,%22Evitaci%25C3%25B3n%22,0]],[[2,1,100,1,0],[1,2,100,1,0]],[[364,944,%22Russ%2520Harris%2520(2019)%2520-%2520Diagrama%2520DOTS%253A%250A%2520%2520Ansiedad%2520-%253E%2520Evitaci%25C3%25B3n%2520-%253E%2520Alivio%2520temporal%2520-%253E%2520Ansiedad.%250A%250A%2520En%2520Loopy%253A%250A%2520Ansiedad%2520%253C-%253E%2520Evitaci%25C3%25B3n%2520experiencial%2520%250A%2520(se%2520refuerzan%2520mutuamente).%22]],3%5D";


    self.loadFromURL = function(){
        // Check for short link ID first
        var shortId = _getParameterByName("s");
        if (shortId) {
            // Load from server
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'save.php?action=get&id=' + encodeURIComponent(shortId), false); // synchronous for now
            xhr.send();
            
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.success && response.model) {
                        self.model.deserialize(response.model);
                        return;
                    }
                } catch (e) {
                    console.error('Error parsing server response:', e);
                }
            }
            // If server load fails, fall through to data parameter or default
        }
        
        // Load from URL data parameter or default
        var data = _getParameterByName("data");
        if(!data) data=decodeURIComponent(_blankData);
        self.model.deserialize(data);
    }; 


    ///////////////////////////
    //////// EMBEDDED? ////////
    ///////////////////////////

    self.init();

    if(self.embedded){

        // Hide all that UI
        self.toolbar.dom.style.display = "none";
        self.sidebar.dom.style.display = "none";

        // If *NO UI AT ALL*
        var noUI = !!parseInt(_getParameterByName("no_ui")); // force to Boolean
        if(noUI){
            _PADDING_BOTTOM = _PADDING;
            self.playbar.dom.style.display = "none";
        }

        // Fullscreen canvas
        document.getElementById("canvasses").setAttribute("fullscreen","yes");
        self.playbar.dom.setAttribute("fullscreen","yes");
        publish("resize");

        // Center & SCALE The Model
        self.model.center(true);
        subscribe("resize",function(){
            self.model.center(true);
        });

        // Autoplay!
        self.setMode(Loopy.MODE_PLAY);

        // Also, HACK: auto signal
        var signal = _getParameterByName("signal");
        if(signal){
            signal = JSON.parse(signal);
            var node = self.model.getNode(signal[0]);
            node.takeSignal({
                delta: signal[1]*0.33
            });
        }

    }else{

        // Center all the nodes & labels

        // If no nodes & no labels, forget it.
        if(self.model.nodes.length>0 || self.model.labels.length>0){

            // Get bounds of ALL objects...
            var bounds = self.model.getBounds();
            var left = bounds.left;
            var top = bounds.top;
            var right = bounds.right;
            var bottom = bounds.bottom;

            // Re-center!
            var canvasses = document.getElementById("canvasses");
            var cx = (left+right)/2;
            var cy = (top+bottom)/2;
            var offsetX = (canvasses.clientWidth+50)/2 - cx;
            var offsetY = (canvasses.clientHeight-80)/2 - cy;

            // MOVE ALL NODES
            for(var i=0;i<self.model.nodes.length;i++){
                var node = self.model.nodes[i];
                node.x += offsetX;
                node.y += offsetY;
            }

            // MOVE ALL LABELS
            for(var i=0;i<self.model.labels.length;i++){
                var label = self.model.labels[i];
                label.x += offsetX;
                label.y += offsetY;
            }

        }

    }

    // NOT DIRTY, THANKS
    self.dirty = false;

    // SHOW ME, THANKS
    document.body.style.opacity = "";

    // GO.
    requestAnimationFrame(self.draw);


}