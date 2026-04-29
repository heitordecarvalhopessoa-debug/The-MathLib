// Initialization and Event Listeners

function getMousePositionOnChart(evt) {
    const rect = document.getElementById('mainChart').getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// Initialize when page loads
window.addEventListener('load', () => {
    document.getElementById('startup-menu').classList.remove('hidden');
});

// Graph container events
const graphContainer = document.getElementById('graph-container');
graphContainer.addEventListener('contextmenu', e => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
});
graphContainer.addEventListener('click', e => {
    if (!annotationAddMode) return;
    const pos = getMousePositionOnChart(e);
    const x = chart.scales.x.getValueForPixel(pos.x);
    const y = chart.scales.y.getValueForPixel(pos.y);
    const label = prompt('Texto da anotação:', `(${x.toFixed(2)}, ${y.toFixed(2)})`);
    if (label) addAnnotation(x, y, label);
});

// Hide context menu when clicking elsewhere
document.addEventListener('click', e => {
    if (!e.target.closest('#context-menu')) hideContextMenu();
});
document.getElementById('context-menu').addEventListener('click', e => e.stopPropagation());

// Initialize chart and menus
initChart();
buildModelMenu();
addInput('sin(x)');
renderAll();

// Setup chart event handlers
chart.options.plugins.zoom.pan.onPanComplete = renderAll;
chart.options.plugins.zoom.zoom.onZoomComplete = renderAll;
