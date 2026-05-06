/**********************************

MODEL!

**********************************/

function Model(loopy){

    var self = this;
    self.loopy = loopy;

    // Properties
    self.speed = 0.05;

    // Create canvas & context
    var canvas = _createCanvas();
    var ctx = canvas.getContext("2d");
    self.canvas = canvas;
    self.context = ctx;



    ///////////////////
    // NODES //////////
    ///////////////////

    // Nodes
    self.nodes = [];
    self.nodeByID = {};
    self.getNode = function(id){
        return self.nodeByID[id];
    };

    // Remove Node
    self.addNode = function(config){

        // Model's been changed!
        publish("model/changed");

        // Add Node
        var node = new Node(self,config);
        self.nodeByID[node.id] = node;
        self.nodes.push(node);
        self.update();
        return node;

    };

    // Remove Node
    self.removeNode = function(node){

        // Model's been changed!
        publish("model/changed");

        // Remove from array
        self.nodes.splice(self.nodes.indexOf(node),1);

        // Remove from object
        delete self.nodeByID[node.id];

        // Remove all associated TO and FROM edges
        for(var i=0; i<self.edges.length; i++){
            var edge = self.edges[i];
            if(edge.to==node || edge.from==node){
                edge.kill();
                i--; // move index back, coz it's been killed
            }
        }
        
    };


    ///////////////////
    // EDGES //////////
    ///////////////////

    // Edges
    self.edges = [];

    // Remove edge
    self.addEdge = function(config){

        // Model's been changed!
        publish("model/changed");

        // Add Edge
        var edge = new Edge(self,config);
        self.edges.push(edge);
        self.update();
        return edge;
    };

    // Remove edge
    self.removeEdge = function(edge){

        // Model's been changed!
        publish("model/changed");

        // Remove edge
        self.edges.splice(self.edges.indexOf(edge),1);

    };

    // Get all edges with start node
    self.getEdgesByStartNode = function(startNode){
        return self.edges.filter(function(edge){
            return(edge.from==startNode);
        });
    };




    ///////////////////
    // LABELS /////////
    ///////////////////

    // Labels
    self.labels = [];

    // Remove label
    self.addLabel = function(config){

        // Model's been changed!
        publish("model/changed");

        // Add label
        var label = new Label(self,config);
        self.labels.push(label);
        self.update();
        return label;
    };

    // Remove label
    self.removeLabel = function(label){

        // Model's been changed!
        publish("model/changed");

        // Remove label
        self.labels.splice(self.labels.indexOf(label),1);
        
    };



    ///////////////////
    // UPDATE & DRAW //
    ///////////////////

    var _canvasDirty = false;

    self.update = function(){

        // Update edges THEN nodes
        for(var i=0;i<self.edges.length;i++) self.edges[i].update(self.speed);
        for(var i=0;i<self.nodes.length;i++) self.nodes[i].update(self.speed);

        // Dirty!
        _canvasDirty = true;

    };

    // SHOULD WE DRAW?
    var drawCountdownFull = 60; // two-second buffer!
    var drawCountdown = drawCountdownFull; 
    
    // ONLY IF MOUSE MOVE / CLICK
    subscribe("mousemove", function(){ drawCountdown=drawCountdownFull; });
    subscribe("mousedown", function(){ drawCountdown=drawCountdownFull; });

    // OR INFO CHANGED
    subscribe("model/changed", function(){
        if(self.loopy.mode==Loopy.MODE_EDIT) drawCountdown=drawCountdownFull;
        if(self.loopy.showCentrality){
            self.calculateCentrality();
            drawCountdown=drawCountdownFull;
        }
    });

    // OR RESIZE or RESET

    subscribe("model/reset",function(){ drawCountdown=drawCountdownFull; });
    subscribe("loopy/mode",function(){
        if(loopy.mode==Loopy.MODE_PLAY){
            drawCountdown=drawCountdownFull*2;
        }else{
            drawCountdown=drawCountdownFull;
        }
    });

    self.draw = function(){

        // SHOULD WE DRAW?
        // ONLY IF ARROW-SIGNALS ARE MOVING
        for(var i=0;i<self.edges.length;i++){
            if(self.edges[i].signals.length>0){
                drawCountdown = drawCountdownFull;
                break;
            }
        }

        // DRAW???????
        drawCountdown--;
        if(drawCountdown<=0) return;

        // Also only draw if last updated...
        if(!_canvasDirty) return;
        _canvasDirty = false;

        // Clear!
        ctx.clearRect(0,0,self.canvas.width,self.canvas.height);

        // Translate
        ctx.save();

        // Translate to center, (translate, scale, translate) to expand to size
        var s = loopy.offsetScale;
        var tx = loopy.offsetX * 2;
        var ty = loopy.offsetY * 2;

        ctx.setTransform(s, 0, 0, s, tx, ty);

        // Draw grid?
        var gridOverlay = document.getElementById('grid-overlay');
        if (gridOverlay && gridOverlay.classList.contains('show')) {
            ctx.save();
            
            // Grid size - use a large fixed size for world coordinates
            var worldWidth = 3000;
            var worldHeight = 3000;
            var startX = -1000;
            var startY = -1000;
            
            var cellWidth = worldWidth / 3;
            var cellHeight = worldHeight / 3;
            
            // Grid labels
            var gridLabels = [
                'Atención', 'Cognición', 'Self',
                'Afecto', 'Conducta', 'Motivación',
                'Biofisiológico', 'Contexto', 'Sociocultural'
            ];
            
            // Draw grid lines
            ctx.strokeStyle = 'rgba(204, 204, 204, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            
            for (var i = 0; i <= 3; i++) {
                // Vertical lines
                ctx.beginPath();
                ctx.moveTo(startX + i * cellWidth, startY);
                ctx.lineTo(startX + i * cellWidth, startY + worldHeight);
                ctx.stroke();
                
                // Horizontal lines
                ctx.beginPath();
                ctx.moveTo(startX, startY + i * cellHeight);
                ctx.lineTo(startX + worldWidth, startY + i * cellHeight);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
            
            // Draw labels
            ctx.font = "bold 40px 'Figtree', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "rgba(136, 136, 136, 0.3)";
            
            for (var row = 0; row < 3; row++) {
                for (var col = 0; col < 3; col++) {
                    var label = gridLabels[row * 3 + col];
                    var x = startX + cellWidth * col + cellWidth / 2;
                    var y = startY + cellHeight * row + cellHeight / 2;
                    ctx.fillText(label, x, y);
                }
            }
            ctx.restore();
        }

        // Draw labels THEN edges THEN nodes
        for(var i=0;i<self.labels.length;i++) self.labels[i].draw(ctx);
        for(var i=0;i<self.edges.length;i++) self.edges[i].draw(ctx);
        for(var i=0;i<self.nodes.length;i++) self.nodes[i].draw(ctx);

        // Restore
        ctx.restore();

    };




    //////////////////////////////
    // SERIALIZE & DE-SERIALIZE //
    //////////////////////////////

    self.serialize = function(){

        var data = [];
        // 0 - nodes
        // 1 - edges
        // 2 - labels
        // 3 - UID

        // Nodes
        var nodes = [];
        for(var i=0;i<self.nodes.length;i++){
            var node = self.nodes[i];
            // 0 - id
            // 1 - x
            // 2 - y
            // 3 - init value
            // 4 - label
            // 5 - hue
            nodes.push([
                node.id,
                Math.round(node.x),
                Math.round(node.y),
                node.init,
                encodeURIComponent(encodeURIComponent(node.label)),
                node.hue
            ]);
        }
        data.push(nodes);

        // Edges
        var edges = [];
        for(var i=0;i<self.edges.length;i++){
            var edge = self.edges[i];
            // 0 - from
            // 1 - to
            // 2 - arc
            // 3 - strength
            // 4 - rotation (optional)
            var dataEdge = [
                edge.from.id,
                edge.to.id,
                Math.round(edge.arc),
                edge.strength
            ];
            if(dataEdge.f==dataEdge.t){
                dataEdge.push(Math.round(edge.rotation));
            }
            edges.push(dataEdge);
        }
        data.push(edges);

        // Labels
        var labels = [];
        for(var i=0;i<self.labels.length;i++){
            var label = self.labels[i];
            // 0 - x
            // 1 - y
            // 2 - text
            labels.push([
                Math.round(label.x),
                Math.round(label.y),
                encodeURIComponent(encodeURIComponent(label.text))
            ]);
        }
        data.push(labels);

        // META.
        data.push(Node._UID);

        // Return as string!
        var dataString = JSON.stringify(data);
        dataString = dataString.replace(/"/gi, "%22"); // and ONLY URIENCODE THE QUOTES
        dataString = dataString.substr(0, dataString.length-1) + "%5D";// also replace THE LAST CHARACTER
        return dataString;

    };

    self.deserialize = function(dataString){

        self.clear();

        var data = JSON.parse(dataString);

        // Get from array!
        var nodes = data[0];
        var edges = data[1];
        var labels = data[2];
        var UID = data[3];

        // Nodes
        for(var i=0;i<nodes.length;i++){
            var node = nodes[i];
            self.addNode({
                id: node[0],
                x: node[1],
                y: node[2],
                init: node[3],
                label: decodeURIComponent(node[4]),
                hue: node[5]
            });
        }

        // Edges
        for(var i=0;i<edges.length;i++){
            var edge = edges[i];
            var edgeConfig = {
                from: edge[0],
                to: edge[1],
                arc: edge[2],
                strength: edge[3]
            };
            if(edge[4]) edgeConfig.rotation=edge[4];
            self.addEdge(edgeConfig);
        }

        // Labels
        for(var i=0;i<labels.length;i++){
            var label = labels[i];
            self.addLabel({
                x: label[0],
                y: label[1],
                text: decodeURIComponent(label[2])
            });
        }

        // META.
        Node._UID = UID;

    };

    self.clear = function(){

        // Just kill ALL nodes.
        while(self.nodes.length>0){
            self.nodes[0].kill();
        }

        // Just kill ALL labels.
        while(self.labels.length>0){
            self.labels[0].kill();
        }
    };



    ////////////////////
    // HELPER METHODS //
    ////////////////////

    self.getNodeByPoint = function(x,y,buffer){
        var result;
        for(var i=self.nodes.length-1; i>=0; i--){ // top-down
            var node = self.nodes[i];
            if(node.isPointInNode(x,y,buffer)) return node;
        }
        return null;
    };

    self.getEdgeByPoint = function(x, y, wholeArrow){
        // TODO: wholeArrow option?
        var result;
        for(var i=self.edges.length-1; i>=0; i--){ // top-down
            var edge = self.edges[i];
            if(edge.isPointOnLabel(x,y)) return edge;
        }
        return null;
    };

    self.getLabelByPoint = function(x, y){
        var result;
        for(var i=self.labels.length-1; i>=0; i--){ // top-down
            var label = self.labels[i];
            if(label.isPointInLabel(x,y)) return label;
        }
        return null;
    };

    // Click to edit!
    subscribe("mouseclick",function(){

        // ONLY WHEN EDITING (and NOT erase)
        if(self.loopy.mode!=Loopy.MODE_EDIT) return;
        if(self.loopy.tool==Loopy.TOOL_ERASE) return;

        // Did you click on a node? If so, edit THAT node.
        var clickedNode = self.getNodeByPoint(Mouse.x, Mouse.y);
        if(clickedNode){
            loopy.sidebar.edit(clickedNode);
            return;
        }

        // Did you click on a label? If so, edit THAT label.
        var clickedLabel = self.getLabelByPoint(Mouse.x, Mouse.y);
        if(clickedLabel){
            loopy.sidebar.edit(clickedLabel);
            return;
        }

        // Did you click on an edge label? If so, edit THAT edge.
        var clickedEdge = self.getEdgeByPoint(Mouse.x, Mouse.y);
        if(clickedEdge){
            loopy.sidebar.edit(clickedEdge);
            return;
        }

        // If the tool LABEL? If so, TRY TO CREATE LABEL.
        if(self.loopy.tool==Loopy.TOOL_LABEL){
            loopy.label.tryMakingLabel();
            return;
        }

        // Otherwise, go to main Edit page.
        loopy.sidebar.showPage("Edit");

    });

    // Centering & Scaling
    self.getBounds = function(){

        // If no nodes & no labels, forget it.
        if(self.nodes.length==0 && self.labels.length==0) return;

        // Get bounds of ALL objects...
        var left = Infinity;
        var top = Infinity;
        var right = -Infinity;
        var bottom = -Infinity;
        var _testObjects = function(objects){
            for(var i=0; i<objects.length; i++){
                var obj = objects[i];
                var bounds = obj.getBoundingBox();
                if(left>bounds.left) left=bounds.left;
                if(top>bounds.top) top=bounds.top;
                if(right<bounds.right) right=bounds.right;
                if(bottom<bounds.bottom) bottom=bounds.bottom;
            }
        };
        _testObjects(self.nodes);
        _testObjects(self.edges);
        _testObjects(self.labels);

        // Return
            return {
                left:left,
                top:top,
                right:right,
                bottom:bottom
            };

        };

        self.maxCentrality = 0;
        self.centralityThreshold = 0;
        self.calculateCentrality = function(){

            // Reset node scores
            for(var i=0; i<self.nodes.length; i++){
                self.nodes[i].centrality = 0;
            }

            // Sum absolute edge strengths
            var maxCentrality = 0;
            for(var i=0; i<self.edges.length; i++){
                var edge = self.edges[i];
                var strength = Math.abs(edge.strength);
                edge.from.centrality += strength;
                edge.to.centrality += strength;
            }

            // Find max centrality
            var scores = [];
            for(var i=0; i<self.nodes.length; i++){
                var c = self.nodes[i].centrality;
                scores.push(c);
                if(c > maxCentrality){
                    maxCentrality = c;
                }
            }
            self.maxCentrality = maxCentrality;

            // Find 80th percentile threshold
            if(scores.length > 0){
                scores.sort(function(a,b){ return a-b; });
                var index = Math.floor(scores.length * 0.8);
                self.centralityThreshold = scores[index];
            } else {
                self.centralityThreshold = 0;
            }

        };

        self.center = function(andScale){

        // If no nodes & no labels, forget it.
        if(self.nodes.length==0 && self.labels.length==0) return;

        // Get bounds of ALL objects...
        var bounds = self.getBounds();
        var left = bounds.left;
        var top = bounds.top;
        var right = bounds.right;
        var bottom = bounds.bottom;

        // Re-center!
        var canvasses = document.getElementById("canvasses");
        var fitWidth = canvasses.clientWidth - _PADDING - _PADDING;
        var fitHeight = canvasses.clientHeight - _PADDING_BOTTOM - _PADDING;
        var cx = (left+right)/2;
        var cy = (top+bottom)/2;
        loopy.offsetX = (_PADDING+fitWidth)/2 - cx;
        loopy.offsetY = (_PADDING+fitHeight)/2 - cy;

        // SCALE.
        if(andScale){

            var w = right-left;
            var h = bottom-top;

            // Wider or taller than screen?
            var modelRatio = w/h;
            var screenRatio = fitWidth/fitHeight;
            var scaleRatio;
            if(modelRatio > screenRatio){
                // wider...
                scaleRatio = fitWidth/w;
            }else{
                // taller...
                scaleRatio = fitHeight/h;
            }

            // Loopy, then!
            loopy.offsetScale = scaleRatio;

        }

    };

}