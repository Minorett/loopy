window.Mouse = {};
Mouse.init = function(target){

    // Double-click detection
    var _lastClickTime = 0;
    var _DOUBLE_CLICK_THRESHOLD = 350;

    // Events!
    var _onmousedown = function(event){
        Mouse.moved = false;
        Mouse.pressed = true;
        Mouse.button = event.button;
        Mouse.originalEvent = event.originalEvent;
        Mouse.startedOnTarget = true;
        Mouse.canvasStartX = event.x;
        Mouse.canvasStartY = event.y;

        // Log screen & model coordinates at mousedown for touch/click diagnostics
        var mode = (window.loopy && loopy.mode !== undefined) ? loopy.mode : "?";
        var modelX = (event.x - (loopy ? loopy.offsetX : 0)) / (loopy ? loopy.offsetScale : 1);
        var modelY = (event.y - (loopy ? loopy.offsetY : 0)) / (loopy ? loopy.offsetScale : 1);
        var eventType = (event.originalEvent && event.originalEvent.type) || "unknown";
        console.log("[DEBUG] mousedown | mode=" + mode + " | screen=(" + event.x.toFixed(1) + "," + event.y.toFixed(1) + ") | model=(" + modelX.toFixed(1) + "," + modelY.toFixed(1) + ") | type=" + eventType);

        publish("mousedown");
    };
    var _onmousemove = function(event){

        // CANVAS COORDS
        Mouse.canvasX = event.x;
        Mouse.canvasY = event.y;

        // DO THE INVERSE (safely check loopy exists)
        var mx = (event.x - (window.loopy ? loopy.offsetX : 0)) / (window.loopy ? loopy.offsetScale : 1);
        var my = (event.y - (window.loopy ? loopy.offsetY : 0)) / (window.loopy ? loopy.offsetScale : 1);

        // Mouse!
        Mouse.x = mx;
        Mouse.y = my;

        // Log screen & model coordinates for mousemove (concise format to reduce spam)
        var mode = (window.loopy && loopy.mode !== undefined) ? loopy.mode : "?";
        var eventType = (event.originalEvent && event.originalEvent.type) || "unknown";
        console.log("[DEBUG] mousemove | mode=" + mode + " | screen=(" + event.x.toFixed(1) + "," + event.y.toFixed(1) + ") | model=(" + mx.toFixed(1) + "," + my.toFixed(1) + ") | type=" + eventType);

        // Allow a small jitter threshold so taps are still
        // treated as clicks on touch screens. Use a larger threshold (10px) for touch events.
        var isTouch = event.originalEvent && (event.originalEvent.type === 'touchmove' || event.originalEvent.type === 'touchstart');
        var jitterThreshold = isTouch ? 100 : 25; // 10px for touch, 5px for mouse
        var dx = event.x - (Mouse.canvasStartX || event.x);
        var dy = event.y - (Mouse.canvasStartY || event.y);
        var dist2 = dx*dx + dy*dy;
        if(dist2 > jitterThreshold) {
            if (!Mouse.moved) console.log("[DEBUG] Movement detected beyond jitter threshold, treating as DRAG");
            Mouse.moved = true;
        } else {
            if (Mouse.pressed) console.log("[DEBUG] Movement ignored (jitter threshold): " + Math.sqrt(dist2).toFixed(2) + "px");
        }
        publish("mousemove");

    };
    var _onmouseup = function(){
        Mouse.pressed = false;
        Mouse.button = -1;
        if(Mouse.startedOnTarget){
            publish("mouseup");
            if(!Mouse.moved){
                publish("mouseclick");
                // Double-click detection: if two clicks within 350ms, emit mousedblclick
                var now = Date.now();
                if(now - _lastClickTime <= _DOUBLE_CLICK_THRESHOLD){
                    publish("mousedblclick", [Mouse.x, Mouse.y]);
                }
                _lastClickTime = now;
            }
        }
        Mouse.moved = false;
        Mouse.startedOnTarget = false;
    };

    // Add mouse & touch events!
    _addMouseEvents(target, _onmousedown, _onmousemove, _onmouseup);

    // Cursor & Update
    Mouse.target = target;
    Mouse.showCursor = function(cursor){
        Mouse.target.style.cursor = cursor;
    };
    Mouse.update = function(){
        Mouse.showCursor("");
    };

};