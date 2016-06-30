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
  var LINEWIDTHS = [1, 3, 5, 10];
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
      '<div class="thr0w_draw_palatte__thumb thr0w_draw_palatte__thumb--closed"></div>'].join('\n');
    // jscs:disable
    contentEl.appendChild(palatteEl);
    var sizeEl = palatteEl.querySelector('.thr0w_draw_palatte__size');
    var sizeDotEl = palatteEl.querySelector('.thr0w_draw_palatte__size__dot');
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
    canvasEl.addEventListener('touchend', handleTouchEnd);
    canvasEl.addEventListener('touchcancel', handleTouchEnd);
    contentEl.appendChild(canvasEl);
    sizeEl.addEventListener('click', nextSize);
    thumbEl.addEventListener('click', toggleOpen);
    for (i = 0; i < pickerEls.length; i++) {
      pickerEls[i].addEventListener('click', pickColor);
    }
    reset();
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
      context.beginPath();
    }
    function handleMouseMove(e) {
      var x;
      var y;
      if (mousePanning) {
        x = (e.pageX - offsetLeft) * scale;
        y = (e.pageY - offsetTop) * scale;
        drawLine(lastX, lastY, x, y);
        lastX = x;
        lastY = y;
      }
    }
    function handleMouseEnd() {
      if (mousePanning) {
        mousePanning = false;
        context.closePath();
      }
    }
    function handleTouchStart(e) {
      if (e.touches.length === 1) {
        lastX = (e.touches[0].pageX - offsetLeft) * scale;
        lastY = (e.touches[0].pageY - offsetTop) * scale;
        context.beginPath();
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
      drawLine(lastX, lastY, x, y);
      lastX = x;
      lastY = y;
    }
    function handleTouchEnd(e) {
      if (e.touches.length === 0) {
        context.closePath();
      }
    }
    function nextSize() {
      linewidthIndex = linewidthIndex + 1 < LINEWIDTHS.length ?
        linewidthIndex + 1 : 0;
      sizeDotEl.style.width = (LINEWIDTHS[linewidthIndex] * 3) + 'px';
      sizeDotEl.style.height = (LINEWIDTHS[linewidthIndex] * 3) + 'px';
      updateLineWidth();
      sendUpdate();
    }
    function toggleOpen() {
      open = !open;
      updateCanvasPalatte();
      sendUpdate();
    }
    function updateCanvasPalatte() {
      if (open) {
        canvasEl.classList.remove('thr0w_draw_canvas--closed');
        palatteEl.classList.remove('thr0w_draw_palatte--closed');
        thumbEl.classList.remove('thr0w_draw_palatte__thumb--closed');
        thumbEl.classList.add('thr0w_draw_palatte__thumb--open');
      } else {
        reset();
        canvasEl.classList.add('thr0w_draw_canvas--closed');
        palatteEl.classList.add('thr0w_draw_palatte--closed');
        thumbEl.classList.remove('thr0w_draw_palatte__thumb--open');
        thumbEl.classList.add('thr0w_draw_palatte__thumb--closed');
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
    }
    function updateLineWidth() {
      context.lineWidth = LINEWIDTHS[linewidthIndex];
    }
    function reset() {
      linewidthIndex = 0;
      var defaultPickerEl = palatteEl.querySelector('.thr0w_draw_palatte__color_picker--default');
      color = defaultPickerEl.style.backgroundColor;
      canvasEl.width = canvasEl.width;
      for (i = 0; i < pickerEls.length; i++) {
        pickerEls[i].classList.remove('thr0w_draw_palatte__color_picker--selected');
      }
      defaultPickerEl.classList.add('thr0w_draw_palatte__color_picker--selected');
      sizeDotEl.style.width = (LINEWIDTHS[linewidthIndex] * 3) + 'px';
      sizeDotEl.style.height = (LINEWIDTHS[linewidthIndex] * 3) + 'px';
      updateColor();
      updateLineWidth();
    }
    function message() {
      return {open: open, color: color, linewidthIndex: linewidthIndex};
    }
    function receive(data) {
      if (data.open !== open) {
        open = !open;
        updateCanvasPalatte();
      }
      color = data.color;
      updateColor();
      linewidthIndex = data.linewidthIndex;
      updateLineWidth();
    }
    function sendUpdate() {
      sync.update();
      sync.idle();
    }
    function drawLine(startX, startY, finishX, finishY) {
      window.requestAnimationFrame(animation);
      function animation() {
        context.moveTo(startX, startY);
        context.lineTo(finishX, finishY);
        context.stroke();
      }
    }
  }
})();
