(function() {
  // jscs:disable
  /**
  * This module provides a drawing tool.
  * @module thr0w-draw
  */
  // jscs:enable
  'use strict';
  if (window.thr0w === undefined) {
    throw 400;
  }
  var PEN_TOOL = 0;
  var ERASER_TOOL = 1;
  var LINEWIDTHS = [1, 3, 5, 10, 15];
  var service = {};
  service.load = load;
  // jscs:disable
  /**
  * This object provides draw functionality.
  * @namespace thr0w
  * @class draw
  * @static
  */
  // jscs:enable
  window.thr0w.draw = service;
  // jscs:disable
  /**
  * This function is used to load the draw functionality into a grid.
  * @method load
  * @static
  * @param grid {Object} The grid, {{#crossLink "thr0w.Grid"}}thr0w.Grid{{/crossLink}}, object.
  */
  // jscs:enable
  function load(grid) {
    if (!grid || typeof grid !== 'object') {
      throw 400;
    }
    var tool = PEN_TOOL;
    var open = false;
    var color = null;
    var linewidthIndex = null;
    var mousePanning = false;
    var lastX;
    var lastY;
    var scale = grid.getRowScale();
    var frameEl = grid.getFrame();
    var contentEl = grid.getContent();
    var offsetLeft = frameEl.offsetLeft + contentEl.offsetLeft;
    var offsetTop = frameEl.offsetTop + contentEl.offsetTop;
    var palatteEl = document.createElement('div');
    var canvasEl = document.createElement('canvas');
    var context = canvasEl.getContext('2d');
    palatteEl.classList.add('thr0w_draw_palatte');
    palatteEl.classList.add('thr0w_draw_palatte--closed');
    // jscs:disable
    palatteEl.innerHTML = [
      '<div class="thr0w_draw_palatte__color_picker--default thr0w_draw_palatte__color_picker" style="background: black;"></div>',
      '<div class="thr0w_draw_palatte__color_picker" style="background: white;"></div>',
      '<div class="thr0w_draw_palatte__color_picker" style="background: red;"></div>',
      '<div class="thr0w_draw_palatte__color_picker" style="background: orange;"></div>',
      '<div class="thr0w_draw_palatte__color_picker" style="background: yellow;"></div>',
      '<div class="thr0w_draw_palatte__color_picker" style="background: green;"></div>',
      '<div class="thr0w_draw_palatte__color_picker" style="background: blue;"></div>',
      '<div class="thr0w_draw_palatte__color_picker" style="background: purple;"></div>',
      '<div class="thr0w_draw_palatte__size">',
      '<div class="thr0w_draw_palatte__size__dot">',
      '</div>',
      '</div>',
      '<div class="thr0w_draw_palatte__tool"></div>',
      '<div class="thr0w_draw_palatte__thumb thr0w_draw_palatte__thumb--closed"></div>'].join('\n');
    // jscs:disable
    contentEl.appendChild(palatteEl);
    var sizeEl = palatteEl.querySelector('.thr0w_draw_palatte__size');
    var sizeDotEl = palatteEl.querySelector('.thr0w_draw_palatte__size__dot');
    var toolEl = palatteEl.querySelector('.thr0w_draw_palatte__tool');
    var thumbEl = palatteEl.querySelector('.thr0w_draw_palatte__thumb');
    var pickerEls = palatteEl.querySelectorAll('.thr0w_draw_palatte__color_picker');
    var i;
    canvasEl.classList.add('thr0w_draw_canvas');
    canvasEl.classList.add('thr0w_draw_canvas--closed');
    canvasEl.width = grid.getWidth();
    canvasEl.height = grid.getHeight();
    canvasEl.addEventListener('mousedown', handleMouseDown);
    canvasEl.addEventListener('mousemove', handleMouseMove);
    canvasEl.addEventListener('mouseup', handleMouseEnd);
    canvasEl.addEventListener('mouseleave', handleMouseEnd);
    canvasEl.addEventListener('touchstart', handleTouchStart);
    canvasEl.addEventListener('touchmove', handleTouchMove);
    contentEl.appendChild(canvasEl);
    sizeEl.addEventListener('click', nextSize);
    toolEl.addEventListener('click', nextTool);
    thumbEl.addEventListener('click', toggleOpen);
    for (i = 0; i < pickerEls.length; i++) {
      pickerEls[i].addEventListener('click', pickColor);
    }
    resetCanvas();
    resetPalatte();
    var sync = new window.thr0w.Sync(
      grid,
      'thr0w_draw_' + contentEl.id,
      message,
      receive
    );
    function handleMouseDown(e) {
      mousePanning = true;
      lastX = (e.pageX - offsetLeft) * scale;
      lastY = (e.pageY - offsetTop) * scale;
    }
    function handleMouseMove(e) {
      var x;
      var y;
      if (mousePanning) {
        x = (e.pageX - offsetLeft) * scale;
        y = (e.pageY - offsetTop) * scale;
        switch (tool) {
          case PEN_TOOL:
            drawLine(lastX, lastY, x, y);
            break;
          case ERASER_TOOL:
            erase(x, y);
            break;
          default:
        }
        lastX = x;
        lastY = y;
      }
    }
    function handleMouseEnd() {
      if (mousePanning) {
        mousePanning = false;
      }
    }
    function handleTouchStart(e) {
      if (e.touches.length === 1) {
        lastX = (e.touches[0].pageX - offsetLeft) * scale;
        lastY = (e.touches[0].pageY - offsetTop) * scale;
      }
    }
    function handleTouchMove(e) {
      var x;
      var y;
      x = (e.touches[0].pageX - offsetLeft) * scale;
      y = (e.touches[0].pageY - offsetTop) * scale;
      if ((x === lastX) && (y === lastY)) {
        return;
      }
      switch (tool) {
        case PEN_TOOL:
          drawLine(lastX, lastY, x, y);
          break;
        case ERASER_TOOL:
          erase(x, y);
          break;
        default:
      }
      lastX = x;
      lastY = y;
    }
    function nextSize() {
      linewidthIndex = linewidthIndex + 1 < LINEWIDTHS.length ?
        linewidthIndex + 1 : 0;
      sizeDotEl.style.width = (LINEWIDTHS[linewidthIndex] * 3) + 'px';
      sizeDotEl.style.height = (LINEWIDTHS[linewidthIndex] * 3) + 'px';
      updateLineWidth();
      sendUpdate();
    }
    function nextTool() {
      toolEl.classList.remove('thr0w_draw_palatte__tool--pen');
      toolEl.classList.remove('thr0w_draw_palatte__tool--eraser');
      if (tool === PEN_TOOL) {
        tool = ERASER_TOOL;
        toolEl.classList.add('thr0w_draw_palatte__tool--eraser');
      } else {
        tool = PEN_TOOL;
        toolEl.classList.add('thr0w_draw_palatte__tool--pen');
      }
      sendUpdate();
    }
    function toggleOpen() {
      open = !open;
      updateCanvas();
      sendUpdate();
      if (open) {
        palatteEl.classList.remove('thr0w_draw_palatte--closed');
        thumbEl.classList.remove('thr0w_draw_palatte__thumb--closed');
        thumbEl.classList.add('thr0w_draw_palatte__thumb--open');
      } else {
        resetPalatte();
        palatteEl.classList.add('thr0w_draw_palatte--closed');
        thumbEl.classList.remove('thr0w_draw_palatte__thumb--open');
        thumbEl.classList.add('thr0w_draw_palatte__thumb--closed');
      }
    }
    function updateCanvas() {
      if (open) {
        canvasEl.classList.remove('thr0w_draw_canvas--closed');
      } else {
        resetCanvas();
        canvasEl.classList.add('thr0w_draw_canvas--closed');
      }
    }
    function pickColor() {
      color = this.style.backgroundColor; // jshint ignore:line
      for (i = 0; i < pickerEls.length; i++) {
        pickerEls[i].classList.remove('thr0w_draw_palatte__color_picker--selected');
      }
      this.classList.add('thr0w_draw_palatte__color_picker--selected'); // jshint ignore:line
      updateColor();
      sendUpdate();
    }
    function updateColor() {
      context.strokeStyle = color;
      context.fillStyle = color;
    }
    function updateLineWidth() {
      context.lineWidth = LINEWIDTHS[linewidthIndex];
    }
    function resetCanvas() {
      color = palatteEl
        .querySelector('.thr0w_draw_palatte__color_picker--default')
        .style.backgroundColor;
      linewidthIndex = 0;
      tool = PEN_TOOL;
      updateColor();
      updateLineWidth();
      canvasEl.width = canvasEl.width; // ERASE CANVAS
    }
    function resetPalatte() {
      for (i = 0; i < pickerEls.length; i++) {
        pickerEls[i].classList.remove('thr0w_draw_palatte__color_picker--selected');
      }
      palatteEl.querySelector('.thr0w_draw_palatte__color_picker--default')
        .classList.add('thr0w_draw_palatte__color_picker--selected');
      sizeDotEl.style.width = (LINEWIDTHS[linewidthIndex] * 3) + 'px';
      sizeDotEl.style.height = (LINEWIDTHS[linewidthIndex] * 3) + 'px';
      toolEl.classList.remove('thr0w_draw_palatte__tool--pen');
      toolEl.classList.remove('thr0w_draw_palatte__tool--eraser');
      toolEl.classList.add('thr0w_draw_palatte__tool--pen');
    }
    function message() {
      return {
        open: open,
        color: color,
        linewidthIndex: linewidthIndex,
        tool: tool
      };
    }
    function receive(data) {
      if (data.open !== open) {
        open = !open;
        updateCanvas();
      }
      color = data.color;
      linewidthIndex = data.linewidthIndex;
      tool = data.tool;
      updateColor();
      updateLineWidth();
    }
    function sendUpdate() {
      sync.update();
      sync.idle();
    }
    function drawLine(startX, startY, finishX, finishY) {
      window.requestAnimationFrame(animation);
      function animation() {
        context.beginPath();
        context.arc(startX, startY,
          LINEWIDTHS[linewidthIndex] / 2, 0, 2 * Math.PI);
        context.closePath();
        context.fill();
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(finishX, finishY);
        context.stroke();
        context.closePath();
      }
    }
    function erase(centerX, centerY) {
      context.clearRect(
        centerX - LINEWIDTHS[linewidthIndex] / 2,
        centerY - LINEWIDTHS[linewidthIndex] / 2,
        LINEWIDTHS[linewidthIndex],
        LINEWIDTHS[linewidthIndex]
      );
    }
  }
})();
