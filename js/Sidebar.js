/**********************************

SIDEBAR CODE

**********************************/

function Sidebar(loopy){

    var self = this;
    PageUI.call(self, document.getElementById("sidebar"));

    // Edit
    self.edit = function(object){
        self.showPage(object._CLASS_);
        self.currentPage.edit(object);
        publish("sidebar/show");
    };

    // Go back to main when the thing you're editing is killed
    subscribe("kill",function(object){
        if(self.currentPage.target==object){
            self.showPage("Edit");
        }
    });

    ////////////////////////////////////////////////////////////////////////////////////////////
    // ACTUAL PAGES ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////

    // Node!
    (function(){
        var page = new SidebarPage();
        page.addComponent(new ComponentButton({
            header: true,
            label: "volver atrás",
            onclick: function(){
                self.showPage("Edit");
            }
        }));
        page.addComponent("label", new ComponentInput({
            label: "<br><br>Nombre:",
            textarea: true
        }));
        page.addComponent("hue", new ComponentSlider({
            bg: "color",
            label: "Color:",
            options: [0, 1, 2, 3, 4, 5, 6, 7],
            oninput: function(value){
                Node.defaultHue = value;
            }
        }));
        page.addComponent("init", new ComponentSlider({
            bg: "initial",
            label: "Intensidad inicial:",
            options: [0, 0.16, 0.33, 0.50, 0.66, 0.83, 1],
            //options: [0, 1/6, 2/6, 3/6, 4/6, 5/6, 1],
            oninput: function(value){
                Node.defaultValue = value;
            }
        }));
        page.addComponent("shape", new ComponentChoices({
            label: "Forma:",
            choices: [
                {label: "Círculo", value: "circle"},
                {label: "Cuadrado", value: "square"},
                {label: "Diamante", value: "diamond"}
            ]
        }));
        page.onedit = function(){

            // Set color of Slider (safely check Node.COLORS exists)
            var node = page.target;
            var colors = (window.Node && Node.COLORS) ? Node.COLORS : ["#ccc"];
            var color = colors[node.hue] || colors[0];
            page.getComponent("init").setBGColor(color);

            // Focus on the name field IF IT'S "" or "?"
            var name = node.label;
            if(name=="" || name=="?") page.getComponent("label").select();

        };
        page.addComponent(new ComponentButton({
            label: "Eliminar elemento",
            //label: "delete circle",
            onclick: function(node){
                node.kill();
                self.showPage("Edit");
            }
        }));
        self.addPage("Node", page);
    })();

    // Edge!
    (function(){
        var page = new SidebarPage();
        page.addComponent(new ComponentButton({
            header: true,
            label: "volver atrás",
            onclick: function(){
                self.showPage("Edit");
            }
        }));
        page.addComponent("strength", new ComponentSlider({
            bg: "strength",
            label: "<br><br>Fuerza de interacción:",
            //label: "Relationship:",
            options: [
                2.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 
                1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1,
                -0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0,
                -1.1, -1.2, -1.3, -1.4, -1.5, -1.6, -1.7, -1.8, -1.9, -2.0
            ],
            oninput: function(value){
                Edge.defaultStrength = value;
            }
        }));
        page.addComponent(new ComponentHTML({
            html: "Tip de Análisis:<br><br>"+
            "<b>Intensidad:</b> Usá el deslizador para ajustar la fuerza exacta. El lado (+) fortalece la relación, el lado (-) la debilita.<br><br>"+
            "<b>Latencia:</b> La longitud de la flecha determina el retraso; cuanto más larga sea, más tardará la señal en llegar."
        }));
        page.addComponent(new ComponentButton({
            //label: "Eliminar interacción",
            label: "Eliminar interacción",
            //label: "delete relationship",
            onclick: function(edge){
                edge.kill();
                self.showPage("Edit");
            }
        }));
        self.addPage("Edge", page);
    })();

    // Label!
    (function(){
        var page = new SidebarPage();
        page.addComponent(new ComponentButton({
            header: true,
            label: "volver atrás",
            onclick: function(){
                self.showPage("Edit");
            }
        }));
        page.addComponent("text", new ComponentInput({
            label: "<br><br>Descripción:",
            //label: "Label:",
            textarea: true
        }));
        page.onshow = function(){
            // Focus on the text field
            page.getComponent("text").select();
        };
        page.onhide = function(){
            
            // If you'd just edited it...
            var label = page.target;
            if(!page.target) return;

            // If text is "" or all spaces, DELETE.
            var text = label.text;
            if(/^\s*$/.test(text)){
                // that was all whitespace, KILL.
                page.target = null;
                label.kill();
            }

        };
        page.addComponent(new ComponentButton({
            label: "Eliminar descripción",
            onclick: function(label){
                label.kill();
                self.showPage("Edit");
            }
        }));
        self.addPage("Label", page);
    })();

    // Edit
    (function(){
        var page = new SidebarPage();
        page.addComponent(new ComponentHTML({
            html: ""+
            
            "<b style='font-size:1.4em'>LOOP español </b> (v2)<br>una herramienta para pensar sistemas complejos.<br><br>"+

            "<span class='mini_button' onclick='publish(\"modal\",[\"examples\"])'>ver ejemplos</span> "+
            "<span class='mini_button' onclick='publish(\"modal\",[\"howto\"])'>tutorial</span><br><br>"+
            "<span class='mini_button' id='centrality_button' onclick='publish(\"centrality/toggle\")'>analizar centralidad</span><br><br>"+

            "<hr/><br>"+

            "<span class='mini_button' onclick='publish(\"modal\",[\"save_link\"])'>guardar como link</span> <br><br>"+
            "<span class='mini_button' onclick='publish(\"export/file\")'>guardar como archivo</span> <br><br>"+
            "<span class='mini_button' onclick='publish(\"save/png\")'>guardar como imagen (.png)</span> <br><br>"+
            "<span class='mini_button' onclick='publish(\"import/file\")'>cargar archivo</span> <br><br>"+
            "<span class='mini_button' onclick='publish(\"modal\",[\"embed\"])'>insertar en tu página web</span> <br><br>"+

            "<hr/><br>"+
                
            "<a target='_blank' href='../'>LOOPY</a> está "+
            "hecho por <a target='_blank' href='http://ncase.me'>nicky case</a> "+
            "con ayuda de <a target='_blank' href='https://www.patreon.com/ncase'> patreon</a> &lt;3<br><br>"+
            "<span style='font-size:1em'>Traducción de Loopy hecha por Lic. Mathias Nicolás Rojas de la Fuente M.N. 87001</a></span>"

        }));
        self.addPage("Edit", page);
    })();

    // Ctrl-S to SAVE
    subscribe("key/save",function(){
        if(Key.control){ // Ctrl-S or ⌘-S
            publish("modal",["save_link"]);
        }
    });

    // Centrality toggle
    subscribe("centrality/toggle", function(){
        loopy.showCentrality = !loopy.showCentrality;
        if(loopy.showCentrality){
            loopy.model.calculateCentrality();
            document.getElementById("centrality_button").setAttribute("active","yes");
        }else{
            document.getElementById("centrality_button").removeAttribute("active");
        }
        publish("model/changed");
    });

    }

function SidebarPage(){

    // TODO: be able to focus on next component with an "Enter".

    var self = this;
    self.target = null;

    // DOM
    self.dom = document.createElement("div");
    self.show = function(){ self.dom.style.display="block"; self.onshow(); };
    self.hide = function(){ self.dom.style.display="none"; self.onhide(); };

    // Components
    self.components = [];
    self.componentsByID = {};
    self.addComponent = function(propName, component){

        // One or two args
        if(!component){
            component = propName;
            propName = "";
        }

        component.page = self; // tie to self
        component.propName = propName; // tie to propName
        self.dom.appendChild(component.dom); // add to DOM

        // remember component
        self.components.push(component);
        self.componentsByID[propName] = component;

        // return!
        return component;

    };
    self.getComponent = function(propName){
        return self.componentsByID[propName];
    };

    // Edit
    self.edit = function(object){

        // New target to edit!
        self.target = object;

        // Show each property with its component
        for(var i=0;i<self.components.length;i++){
            self.components[i].show();
        }

        // Callback!
        self.onedit();

    };

    // TO IMPLEMENT: callbacks
    self.onedit = function(){};
    self.onshow = function(){};
    self.onhide = function(){};

    // Start hiding!
    self.hide();

}



/////////////////////////////////////////////////////////////////////////////////////////////
// COMPONENTS ///////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

function Component(){
    var self = this;
    self.dom = null;
    self.page = null;
    self.propName = null;
    self.show = function(){
        // TO IMPLEMENT
    };
    self.getValue = function(){
        return self.page.target[self.propName];
    };
    self.setValue = function(value){
        
        // Model's been changed!
        publish("model/changed");

        // Edit the value!
        self.page.target[self.propName] = value;
        self.page.onedit(); // callback!
        
    };
}

function ComponentInput(config){

    // Inherit
    var self = this;
    Component.apply(self);

    // DOM: label + text input
    self.dom = document.createElement("div");
    var label = _createLabel(config.label);
    var className = config.textarea ? "component_textarea" : "component_input";
    var input = _createInput(className, config.textarea);
    input.oninput = function(event){
        self.setValue(input.value);
    };
    self.dom.appendChild(label);
    self.dom.appendChild(input);

    // Show
    self.show = function(){
        input.value = self.getValue();
    };

    // Select
    self.select = function(){
        setTimeout(function(){ input.select(); },10);
    };

}

function ComponentSlider(config){

    // Inherit
    var self = this;
    Component.apply(self);

    // TODO: control with + / -, alt keys??

    // DOM: label + slider
    self.dom = document.createElement("div");
    var labelText = config.label;
    var label = _createLabel(labelText);
    self.dom.appendChild(label);

    // Polarity Indicators
    if(config.bg === "strength"){
        var indicators = document.createElement("div");
        indicators.setAttribute("class", "component_slider_indicators");
        indicators.innerHTML = "<span>(+)</span><span>(-)</span>";
        self.dom.appendChild(indicators);
    }

    var sliderDOM = document.createElement("div");
    sliderDOM.setAttribute("class","component_slider");
    self.dom.appendChild(sliderDOM);

    // Update Label
    var updateLabel = function(){
        if(config.bg === "strength"){
            var value = self.getValue();
            var sign = (value > 0) ? "+" : "";
            label.innerHTML = labelText + " " + sign + value.toFixed(1);
        }
    };

    // Slider DOM: graphic + pointer
    var slider;
    if(config.bg === "color"){
        slider = document.createElement("div");
        slider.style.width = "250px";
        slider.style.height = "31.25px";
        slider.style.display = "flex";
        slider.setAttribute("class","component_slider_graphic");
        var colors = (window.Node && Node.COLORS) ? Node.COLORS : ["#ccc"];
        for(var i=0; i<colors.length; i++){
            var square = document.createElement("div");
            square.style.flex = "1";
            square.style.height = "100%";
            square.style.backgroundColor = colors[i];
            slider.appendChild(square);
        }
    } else {
        slider = new Image();
        slider.draggable = false;
        slider.src = "css/sliders/"+config.bg+".png";
        slider.setAttribute("class","component_slider_graphic");
    }

    var pointer = new Image();
    pointer.draggable = false;
    pointer.src = "css/sliders/slider_pointer.png";
    pointer.setAttribute("class","component_slider_pointer");
    if(config.bg === "color") pointer.style.top = "33.25px";
    sliderDOM.appendChild(slider);
    sliderDOM.appendChild(pointer);

    // Native Slider
    var nativeSlider;
    if(config.bg === "strength"){
        nativeSlider = _createInput("component_slider_native");
        nativeSlider.type = "range";
        nativeSlider.min = 0;
        nativeSlider.max = config.options.length - 1;
        nativeSlider.step = 1;
        self.dom.appendChild(nativeSlider);
    } else {
        slider.style.cursor = "default";
    }

    var movePointer = function(){
        var value = self.getValue();
        var optionIndex = config.options.indexOf(value);
        var x = (optionIndex+0.5) * (250/config.options.length);
        pointer.style.left = (x-7.5)+"px";
        if(nativeSlider) nativeSlider.value = optionIndex;
    };

    // Native Slider Input
    if(nativeSlider){
        nativeSlider.oninput = function(){
            var optionIndex = parseInt(nativeSlider.value);
            var option = config.options[optionIndex];
            self.setValue(option);
            if(config.oninput) config.oninput(option);
            movePointer();
            updateLabel();
        };
    }

    // On click... (or on drag)
    var isDragging = false;
    var onmousedown = function(event){
        isDragging = true;
        sliderInput(event);
    };
    var onmouseup = function(){
        isDragging = false;
    };
    var onmousemove = function(event){
        if(isDragging) sliderInput(event);
    };
    var sliderInput = function(event){

        // What's the option?
        var index = event.x/250;
        var optionIndex = Math.floor(index*config.options.length);
        var option = config.options[optionIndex];
        if(option===undefined) return;
        self.setValue(option);

        // Callback! (if any)
        if(config.oninput){
            config.oninput(option);
        }

        // Move pointer there.
        movePointer();

        // Update label
        updateLabel();

    };
    _addMouseEvents(slider, onmousedown, onmousemove, onmouseup);

    // Show
    self.show = function(){
        movePointer();
        updateLabel();
    };

    // BG Color!
    self.setBGColor = function(color){
        slider.style.background = color;
    };

}

function ComponentButton(config){

    // Inherit
    var self = this;
    Component.apply(self);

    // DOM: just a button
    self.dom = document.createElement("div");
    var button = _createButton(config.label, function(){
        config.onclick(self.page.target);
    });
    self.dom.appendChild(button);

    // Unless it's a HEADER button!
    if(config.header){
        button.setAttribute("header","yes");
    }

}

function ComponentHTML(config){

    // Inherit
    var self = this;
    Component.apply(self);

    // just a div
    self.dom = document.createElement("div");
    self.dom.innerHTML = config.html;

}

function ComponentOutput(config){

    // Inherit
    var self = this;
    Component.apply(self);

    // DOM: just a readonly input that selects all when clicked
    self.dom = _createInput("component_output");
    self.dom.setAttribute("readonly", "true");
    self.dom.onclick = function(){
        self.dom.select();
    };

    // Output the string!
    self.output = function(string){
        self.dom.value = string;
    };

}

function ComponentChoices(config){

    // Inherit
    var self = this;
    Component.apply(self);

    // DOM: label + choices
    self.dom = document.createElement("div");
    var label = _createLabel(config.label);
    self.dom.appendChild(label);

    var choicesDOM = document.createElement("div");
    choicesDOM.setAttribute("class", "component_choices");
    self.dom.appendChild(choicesDOM);

    // Create choices
    for(var i=0; i<config.choices.length; i++){
        var choice = config.choices[i];
        var button = document.createElement("div");
        button.setAttribute("class", "component_choice");
        button.innerHTML = choice.label;
        
        (function(value){
            button.onclick = function(){
                self.setValue(value);
                if(config.oninput) config.oninput(value);
                self.show();
            };
        })(choice.value);
        
        choicesDOM.appendChild(button);
    }

    // Show
    self.show = function(){
        var value = self.getValue();
        for(var i=0; i<choicesDOM.children.length; i++){
            var button = choicesDOM.children[i];
            var choice = config.choices[i];
            if(choice.value == value){
                button.setAttribute("active", "yes");
            } else {
                button.removeAttribute("active");
            }
        }
    };

}