# LOOPY.ESP (v1.1)

LOOPY es una herramienta interactiva basada en la web para el pensamiento sistémico. Permite crear simulaciones de sistemas complejos mediante diagramas visuales de forma fácil y lúdica.

Esta versión, **LOOPY.ESP**, es una adaptación y extensión del [LOOPY original](https://ncase.me/loopy/) desarrollado por [Nicky Case](http://ncase.me/).

## 🚀 Nuevas Características

Esta versión (v1.1) incluye las siguientes mejoras y adaptaciones:

1.  **Traducción completa al español**: Toda la interfaz de usuario, menús y mensajes han sido traducidos íntegramente al castellano.
2.  **Grilla de Análisis Clínico (3x3)**: Se ha implementado una cuadrícula de análisis 3x3 con un botón de alternancia (toggle) para facilitar el mapeo y estudio de sistemas en contextos clínicos y profesionales.
3.  **Soporte para ajuste de línea (Word-wrap)**: Las etiquetas de los nodos ahora admiten múltiples líneas de texto, permitiendo descripciones más detalladas sin perder legibilidad.
4.  **Fuerza de relación granular**: Ahora es posible definir la fuerza de los bordes con mayor precisión (en un rango de 0.1 a 2.0). El grosor de la línea y el tamaño de la punta de la flecha se ajustan proporcionalmente a esta fuerza.
5.  **Diferenciación visual de flechas**:
    *   **Puntas sólidas**: Identifican relaciones positivas (+).
    *   **Puntas contorneadas (Outlined)**: Identifican relaciones negativas (-).
6.  **Analizar Centralidad**: Nueva funcionalidad que permite visualizar la importancia relativa de cada nodo en el sistema mediante un "Mapa de Calor" (halos de colores que indican el grado de influencia).
7.  **Exportación a PNG**: Opción para exportar el modelo actual directamente como una imagen en formato PNG.
8.  **Atajo de teclado**: Se ha añadido la tecla **D** como acceso directo para activar rápidamente la herramienta de dibujo (Pencil).
9.  **Créditos de Adaptación**: La traducción al español y las adaptaciones para el análisis clínico han sido realizadas por el **Lic. Mathias Nicolás Rojas de la Fuente**.

## 🛠️ Cómo usar

-   **Dibujar**: Usa el lápiz para crear nodos (círculos) y relaciones (flechas entre círculos).
-   **Editar**: Haz clic en un nodo o flecha para cambiar su nombre, color o fuerza.
-   **Jugar**: Cambia al modo "Play" para interactuar con el sistema haciendo clic en los nodos para aumentar o disminuir sus valores.
-   **Analizar**: Activa la Grilla Clínica o el Análisis de Centralidad para profundizar en el estudio del sistema.

## 💻 Ejecución local

Al ser una aplicación basada en HTML5 y JavaScript puro (vanilla JS), para ejecutarla localmente solo necesitas abrir el archivo `index.html` en cualquier navegador moderno. No requiere de servidores ni procesos de compilación.

## 📜 Licencia

LOOPY es software de dominio público (CC0). Eres libre de usarlo, modificarlo y compartirlo.

---
Adaptado por el **Lic. Mathias Nicolás Rojas de la Fuente** para su uso en contextos clínicos y educativos.
Basado en el trabajo original de **Nicky Case**.
