/*
 * Copyright (c) 2017 CCS/GMRV/UPM/URJC.
 *
 * Authors: Juan P. Brito <juanpedro.brito@upm.es>
 * 			Nicusor Cosmin Toader <cosmin.toader@urjc.es>
 *
 * This library is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License version 3.0 as published
 * by the Free Software Foundation.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 */

MSP.MacroscopicViewElipse = function () {
  this.selecting = false;
  this.zoombehavior;
  this.MSPViewType = "MacroV";
  this.neuronsPosX = [];
  this.neuronsPosY = [];
  this.squareSideLength;
  this.horizontalPositionsNum;
  this.context;
  this.translateX = 0;
  this.translateY = 0;
  this.scale = 1;
  this.hiddenCanvasContext;
  this.scaleBandHeight;
  this.sizeRatio;
  this.selectionRectangle = {x: 0, y: 0, x2: 0, y2: 0};
  this.mouseClickDown = false;
  this.connectionWidth = 0.2;
  this.strokeWidth = 0.1;
};

MSP.MacroscopicViewElipse.prototype = {
  constructor: MSP.MacroscopicViewElipse,

  resize: function () {
    this.generateMacroscopicViewElipse();
  },

  init: function () {
    _SingletonConfig.shiftKey = false;
    _SimulationController.view.selecting = _SingletonConfig.gSelectionIds.length > 0;
    this.recalculatePositions();
  },

  update: function () {
    this.recalculatePositions();
    this.draw();
  },

  generateMacroscopicViewElipse: function () {
    this.init();
    d3.selectAll("svg").filter(function () {
      return !this.classList.contains('color')
    }).remove();

    d3.selectAll("canvas").filter(function () {
      return !this.classList.contains('imgCanvas')
    }).remove();

    this.zoombehavior = d3.behavior.zoom().scaleExtent([-Infinity, Infinity]).on("zoom", this.zoom);

    _SingletonConfig.svg = d3.select("#renderArea")
                             .append("canvas")
                             .attr("id", "canvas")
                             .attr("width", _SingletonConfig.width)
                             .attr("height", _SingletonConfig.height)
                             .attr("tabindex", 1)
                             .style("cursor", "crosshair")
                             .call(this.zoombehavior);

    this.context = _SingletonConfig.svg.node().getContext("2d");

    _SingletonConfig.svg.on('keydown', this.keyDown, false);
    _SingletonConfig.svg.on('keyup', this.keyUp, false);
    _SingletonConfig.svg.on('mousedown', this.mouseDown, false);
    _SingletonConfig.svg.on('mousemove', this.mouseMove, false);
    _SingletonConfig.svg.on('mouseup', this.mouseUp, false);

    $('body').on('contextmenu', '#canvas', function (e) {
      return false;
    });

    this.draw();
  },

  draw: function () {
    var self = this;
    var context = this.context;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, _SingletonConfig.width, _SingletonConfig.height);
    context.translate(_SimulationController.view.translateX, _SimulationController.view.translateY);
    context.scale(_SimulationController.view.scale, _SimulationController.view.scale);

    var lIndex = _SimulationController.actSimStep % _SimulationData.numSimStepsPerFile;
    context.lineWidth = this.sizeRatio * 0.2;

    function canvas_arrow(context, fromx, fromy, tox, toy) {

      var figureSize = self.sizeRatio;
      var headlen = figureSize;
      var distFig = figureSize * 2.5;
      var angle = Math.atan2(toy - fromy, tox - fromx);
      var dist = Math.sqrt(Math.pow(tox - fromx, 2) + (Math.pow(toy - fromy, 2)));
      var x1 = fromx + ((-distFig / dist) * (fromx - tox));
      var y1 = fromy + ((-distFig / dist) * (fromy - toy));
      var x2 = tox + ((distFig / dist) * (fromx - tox));
      var y2 = toy + ((distFig / dist) * (fromy - toy));
      context.beginPath();

      context.fillStyle = "#000";
      context.moveTo(x1, y1);
      context.lineTo(x1 - headlen * Math.cos(angle - Math.PI / 14), y1 - headlen * Math.sin(angle - Math.PI / 14));
      context.lineTo(x1 - headlen * Math.cos(angle + Math.PI / 14), y1 - headlen * Math.sin(angle + Math.PI / 14));
      context.lineTo(x1, y1);
      context.fill();

      context.beginPath();
      context.moveTo(x2, y2);
      context.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 14), y2 - headlen * Math.sin(angle - Math.PI / 14));
      context.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 14), y2 - headlen * Math.sin(angle + Math.PI / 14));
      context.lineTo(x2, y2);
      context.fill();
    }

    var data = [{
      draw: _SimulationData.drawEEConn,
      data: _SimulationData.gConnectivity.EE[_SimulationData.steps[_SimulationController.actSimStep]],
      color: _SingletonConfig.EEColor
    },
      {
        draw: _SimulationData.drawEIConn,
        data: _SimulationData.gConnectivity.EI[_SimulationData.steps[_SimulationController.actSimStep]],
        color: _SingletonConfig.EIColor
      },
      {
        draw: _SimulationData.drawIEConn,
        data: _SimulationData.gConnectivity.IE[_SimulationData.steps[_SimulationController.actSimStep]],
        color: _SingletonConfig.IEColor
      },
      {
        draw: _SimulationData.drawIIConn,
        data: _SimulationData.gConnectivity.II[_SimulationData.steps[_SimulationController.actSimStep]],
        color: _SingletonConfig.IIColor
      }];

    var i = 0;
    var k = 0;
    _SimulationFilter.orderIndex.forEach(function (z) {
      var d = _SimulationData.gNeurons[z];
      if (d.centerElipse) {
        d.elipseIndex = i;
        i++;
      }
      else {
        d.elipseIndex = k;
        k++;
      }
    });

    data.forEach(
      function (d, i) {
        var color = d.color;
        if (d.draw
            && typeof (d.data) !== "undefined") {
          d.data.forEach(function (d) {
            var posX1 = self.neuronsPosX[_SimulationData.gNeurons[d[0]].elipseIndex];
            var posY1 = self.neuronsPosY[_SimulationData.gNeurons[d[0]].elipseIndex];
            var posX2 = self.neuronsPosX[_SimulationData.gNeurons[d[1]].elipseIndex];
            var posY2 = self.neuronsPosY[_SimulationData.gNeurons[d[1]].elipseIndex];
            if (_SimulationData.gNeurons[d[0]].centerElipse) {
              posX1 = self.neuronsPosXA[_SimulationData.gNeurons[d[0]].elipseIndex];
              posY1 = self.neuronsPosYA[_SimulationData.gNeurons[d[0]].elipseIndex];

            }
            if (_SimulationData.gNeurons[d[1]].centerElipse) {
              posX2 = self.neuronsPosXA[_SimulationData.gNeurons[d[1]].elipseIndex];
              posY2 = self.neuronsPosYA[_SimulationData.gNeurons[d[1]].elipseIndex];
            }
            context.beginPath();
            context.strokeStyle = "#777777";
            context.globalAlpha = 0.1;
            if ((self.selecting && (_SimulationData.gNeurons[d[0]].selected && _SingletonConfig.outgoingConn) ||
                (_SimulationData.gNeurons[d[1]].selected && _SingletonConfig.incomingConn))
                || (!self.selecting &&
                    (_SimulationFilter.gNeuronsFilterB[d[0]] || _SimulationFilter.gNeuronsFilterB[d[1]]))) {
              context.globalAlpha = _SingletonConfig.macroVAlpha;
              context.strokeStyle = color;
            }
            context.moveTo(posX1, posY1);
            context.lineTo(posX2, posY2);
            context.stroke();
            canvas_arrow(context, posX1, posY1, posX2, posY2);
            context.globalAlpha = 1;


          });
        }

      }
    );

    var figureSize = this.sizeRatio;
    _SimulationData.gNeurons.forEach(function (d, i) {
      var posX = 0;
      var posY = 0;
      if (d.centerElipse) {
        posX = self.neuronsPosXA[d.elipseIndex];
        posY = self.neuronsPosYA[d.elipseIndex];
      }
      else {
        posX = self.neuronsPosX[d.elipseIndex];
        posY = self.neuronsPosY[d.elipseIndex];
      }

      context.lineWidth = figureSize * 10 / 100;
      context.globalAlpha = 1;
      if (d.NAct === "E")
        context.fillStyle = _SimulationData.CaEScale(_SimulationData.gNeuronsDetails[d.NId].Calcium[lIndex]);
      else
        context.fillStyle = _SimulationData.CaIScale(_SimulationData.gNeuronsDetails[d.NId].Calcium[lIndex]);

      if ((!d.selected && self.selecting) || (!_SimulationFilter.gNeuronsFilterB[d.NId])) {
        context.fillStyle = "#434343";
        context.globalAlpha = 0.1;
      }

      context.strokeStyle = "#000";

      if (d.NAct === "E") {
        context.beginPath();
        context.moveTo(posX - figureSize, posY + figureSize);
        context.lineTo(posX, posY - figureSize);
        context.lineTo(posX + figureSize, posY + figureSize);
        context.fill();
        context.lineTo(posX - figureSize, posY + figureSize);
        context.lineTo(posX, posY - figureSize);
        context.stroke();
      } else {
        context.beginPath();
        context.arc(posX, posY, figureSize, 0, 2 * Math.PI);
        context.fill();
        context.beginPath();
        context.arc(posX, posY, figureSize, 0, 2 * Math.PI);
        context.stroke();
      }

    });
  },

  recalculatePositions: function () {
    var self = this;
    this.sizeRatio = _SingletonConfig.height / 1000;
    var radius = _SingletonConfig.height - 50;

    var selected = [];
    var nonSelected = [];

    _SimulationData.gNeurons.forEach(function (d) {
      if (d.centerElipse) selected.push(d.NId);
      else nonSelected.push(d.NId);
    });

    var step = 2 * Math.PI / selected.length;
    var h = _SingletonConfig.width / 2;
    var k = (_SingletonConfig.height - 50) / 2;
    var r = radius / 4;
    this.neuronsPosXA = [];
    this.neuronsPosYA = [];
    for (var theta = 0; theta < 2 * Math.PI && selected.length > 0; theta += step) {
      var x = h + r * Math.cos(theta);
      var y = k - 0.47 * r * Math.sin(theta);
      this.neuronsPosXA.push(x);
      this.neuronsPosYA.push(y);
    }

    var step = 2 * Math.PI / nonSelected.length;
    var r = radius;
    this.neuronsPosX = [];
    this.neuronsPosY = [];
    for (var theta = 0; theta < 2 * Math.PI; theta += step) {
      var x = h + r * Math.cos(theta);
      var y = k - 0.47 * r * Math.sin(theta);
      this.neuronsPosX.push(x);
      this.neuronsPosY.push(y);
    }

    selected.forEach(function (d, i) {
      _SimulationData.gNeurons[d].PosX = self.neuronsPosXA[i];
      _SimulationData.gNeurons[d].PosY = self.neuronsPosYA[i];
    });

    nonSelected.forEach(function (d, i) {
      _SimulationData.gNeurons[d].PosX = self.neuronsPosX[i];
      _SimulationData.gNeurons[d].PosY = self.neuronsPosY[i];
    });

  },

  updateVisualization: function () {
    this.draw();
  },

  mouseDown: function () {
    var self = _SimulationController.view;
    if (_SingletonConfig.shiftKey) {
      self.selectionRectangle.x = d3.mouse(this)[0];
      self.selectionRectangle.y = d3.mouse(this)[1];
      self.mouseClickDown = true;
      var sizeRatio = self.sizeRatio;

      var x = (d3.mouse(this)[0] - self.translateX) / self.scale;
      var y = (d3.mouse(this)[1] - self.translateY) / self.scale;

      var minX = x - sizeRatio;
      var maxX = x + sizeRatio;
      var minY = y - sizeRatio;
      var maxY = y + sizeRatio;
      var found = false;
      var idx = -1;
      var length = _SimulationData.gNeurons.length;

      for (var i = 0; i < length; i++) {
        var d = _SimulationData.gNeurons[i];
        var posX = self.neuronsPosX[d.elipseIndex];
        var posY = self.neuronsPosY[d.elipseIndex];
        if (d.centerElipse) {
          posX = self.neuronsPosXA[d.elipseIndex];
          posY = self.neuronsPosYA[d.elipseIndex];
        }

        if (posX >= minX && posX <= maxX && posY >= minY && posY <= maxY) {
          found = true;
          idx = i;
          break;
        }
      }

      if (found) {
        _SimulationData.gNeurons[idx].selected = !_SimulationData.gNeurons[idx].selected;
        self.draw();
      }
    }
    _SimulationData.gNeurons.forEach(function (d) {
                                       d.previouslySelected = _SingletonConfig.shiftKey && d.selected;
                                     }
    );
  },

  mouseMove: function () {
    var self = _SimulationController.view;
    var lIndex = _SimulationController.actSimStep % _SimulationData.numSimStepsPerFile;
    var context = self.context;
    if (self.mouseClickDown && _SingletonConfig.shiftKey) {
      self.selectionRectangle.x2 = d3.mouse(this)[0];
      self.selectionRectangle.y2 = d3.mouse(this)[1];
      var x = (self.selectionRectangle.x - self.translateX) / self.scale;
      var y = (self.selectionRectangle.y - self.translateY) / self.scale;
      var x2 = (self.selectionRectangle.x2 - self.translateX) / self.scale;
      var y2 = (self.selectionRectangle.y2 - self.translateY) / self.scale;

      _SimulationData.gNeurons.forEach(function (d, i) {
        var posX = self.neuronsPosX[d.elipseIndex];
        var posY = self.neuronsPosY[d.elipseIndex];
        if (d.centerElipse) {
          posX = self.neuronsPosXA[d.elipseIndex];
          posY = self.neuronsPosYA[d.elipseIndex];
        }
        d.selected = d.previouslySelected ^
                     (Math.min(x, x2) <= posX
                      && posX < Math.max(x, x2)
                      && Math.min(y, y2) <= posY
                      && posY < Math.max(y, y2));
      });

      self.draw();
      context.fillStyle = "rgb(0,0,0)";

      context.rect((self.selectionRectangle.x - self.translateX) / self.scale,
                   (self.selectionRectangle.y - self.translateY) / self.scale,
                   (self.selectionRectangle.x2 - self.translateX) / self.scale -
                   (self.selectionRectangle.x - self.translateX) / self.scale,
                   (self.selectionRectangle.y2 - self.translateY) / self.scale -
                   (self.selectionRectangle.y - self.translateY) / self.scale);
      context.stroke();
      context.globalAlpha = 0.1;
      context.fill();
      context.globalAlpha = 1;

    }
    var sizeRatio = self.sizeRatio;

    var x = (d3.mouse(this)[0] - self.translateX) / self.scale;
    var y = (d3.mouse(this)[1] - self.translateY) / self.scale;


    var minX = x - sizeRatio;
    var maxX = x + sizeRatio;
    var minY = y - sizeRatio;
    var maxY = y + sizeRatio;
    var found = false;
    var idx = -1;
    var length = _SimulationData.gNeurons.length;

    for (var i = 0; i < length; i++) {
      var d = _SimulationData.gNeurons[i];

      var posX = self.neuronsPosX[d.elipseIndex];
      var posY = self.neuronsPosY[d.elipseIndex];
      if (d.centerElipse) {
        posX = self.neuronsPosXA[d.elipseIndex];
        posY = self.neuronsPosYA[d.elipseIndex];
      }

      if (posX >= minX && posX <= maxX && posY >= minY && posY <= maxY) {
        found = true;
        idx = i;
        break;
      }
    }
    if (found) {
      var d = _SimulationData.gNeurons[idx];
      var tooltipX = d3.mouse(d3.select('body').node())[0];
      var tooltipWidth = $("#tooltip").outerWidth();

      if ((tooltipX + tooltipWidth) > $(window).width())
        tooltipX -= tooltipWidth;

      d3.select("#tooltip")
        .html(
          "Id: <b>" + d.NId
          + "</b><br> CaC= <b>" + _SimulationData.gNeuronsDetails[d.NId].Calcium[lIndex] + "</b>"
        )
        .style("left", tooltipX + "px")
        .style("top", d3.mouse(this)[1] + 10 + "px")
        .classed("hidden", false);
    } else {
      d3.select("#tooltip").classed("hidden", true);
    }
  },

  mouseUp: function () {
    var self = _SimulationController.view;
    _SingletonConfig.gSelectionIds = [];
    _SimulationData.gNeurons.forEach(function (d) {
      if (d.selected)
        _SingletonConfig.gSelectionIds.push(d.NId);
    });
    self.selecting = (_SingletonConfig.gSelectionIds.length > 0);
    self.draw();
    self.mouseClickDown = false;
  },

  keyDown: function () {
    var self = _SimulationController.view;
    _SingletonConfig.shiftKey = d3.event.shiftKey || d3.event.metaKey;
    if (_SingletonConfig.shiftKey) {
      _SingletonConfig.svg.call(d3.behavior.zoom());
      _SingletonConfig.svg.style("cursor", "crosshair");
    }
    else if (d3.event.which === 27) {
      self.selecting = false;
      _SimulationData.gNeurons.forEach(function (d) {
        d.previouslySelected = false;
        d.selected = false;
      });
      self.draw();
    }
  },

  keyUp: function () {
    var self = _SimulationController.view;
    _SingletonConfig.shiftKey = d3.event.shiftKey || d3.event.metaKey;
    _SingletonConfig.svg.call(self.zoombehavior);
    _SingletonConfig.svg.style("cursor", "crosshair");
  },

  zoom: function () {
    var self = _SimulationController.view;
    self.translateX = d3.event.translate[0];
    self.translateY = d3.event.translate[1];
    self.scale = d3.event.scale;
    self.draw();
  }
};
