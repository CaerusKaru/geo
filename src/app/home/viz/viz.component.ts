import {
  Component, ElementRef, HostListener, OnDestroy, OnInit, Renderer2,
  ViewChild
} from '@angular/core';
import {Subject} from 'rxjs/Subject';

import * as pnltri from 'pnltri';

interface Triangle {
  a: number;
  b: number;
  c: number;
}

@Component({
  selector: 'geo-viz',
  templateUrl: './viz.component.html',
  styleUrls: ['./viz.component.scss']
})
export class VizComponent implements OnInit, OnDestroy {

  @ViewChild('viz') svg: ElementRef;

  polydone = false;
  lastdot: SVGPoint;
  mouseactive = false;
  triDone = false;
  cursorx = 0;
  cursory = 0;
  pointA = false;
  pointB = false;
  pA: SVGPoint;
  pB: SVGPoint;
  showTriangulation = false;

  dots: SVGPoint[] = [];
  adjList = [];
  centers = [];
  triangulation: Triangle[];

  private _destroy = new Subject<void>();

  @HostListener('mouseenter')
  mouseenter() {
    this.mouseactive = true;
  }

  @HostListener('mouseleave')
  mouseleave() {
    this.mouseactive = false;
  }

  @HostListener('mousemove', ['$event'])
  @HostListener('touchmove', ['$event'])
  mousemove(evt: MouseEvent) {
    const pt = this.getLocalMouse(evt);
    this.cursorx = pt.x;
    this.cursory = pt.y;
  }

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onclick(evt: MouseEvent) {
    if (this.polydone && !this.pointA && !this.pointB) {
      return;
    }
    let pt = this.getLocalMouse(evt);
    if (this.pointA) {
      this.pA = pt;
      this.pointA = false;
      this.pointB = true;
      return;
    }
    if (this.pointB) {
      this.pB = pt;
      this.pointB = false;
      this.renderer.setStyle(this.svg.nativeElement, 'cursor', 'auto');
      return;
    }
    if (this.dots.length > 0 && this.getDistance(this.dots[0], pt) < 20) {
      pt = this.dots[0];
      this.polydone = true;
      this.pointA = true;
      this.adjList[0].push(this.dots.length - 1);
      this.adjList[this.dots.length - 1].push(0);
    } else {
      this.adjList.push([]);
      if (this.dots.length > 1) {
        this.adjList[this.dots.length - 1].push(this.dots.length);
        this.adjList[this.dots.length].push(this.dots.length - 1);
      }
    }
    this.dots.push(pt);
    this.lastdot = pt;
  }

  constructor(private _element: ElementRef, private renderer: Renderer2) { }

  ngOnInit() {
  }

  findCenter(tri: Triangle) {
    const triA = this.dots[tri.a];
    const triB = this.dots[tri.b];
    const triC = this.dots[tri.c];
    const x = (triA.x + triB.x + triC.x) / 3;
    const y = (triA.y + triB.y + triC.y) / 3;
    const pt = this.svg.nativeElement.createSVGPoint();
    pt.x = x;
    pt.y = y;
    return pt;
  }

  printCenters() {
    this.triangulation.forEach(t => {
      this.centers.push(this.findCenter(t));
    });
  }

  triangulate() {
    const triangulator = new pnltri.Triangulator();
    const triTask = triangulator.triangulate_polygon([this.dots]);
    this.triangulation = triTask.map(t => {
      return {a: t[0], b: t[1], c: t[2]};
    });
    this.triDone = true;
    this.printCenters();
  }

  getTri(triangle: Triangle) {
    if (!this.showTriangulation) {
      return '';
    }
    const triA = this.dots[triangle.a];
    const triB = this.dots[triangle.b];
    const triC = this.dots[triangle.c];
    return `${triA.x},${triA.y} ${triB.x},${triB.y} ${triC.x},${triC.y} ${triA.x},${triA.y}`;
  }

  clear() {
    this.dots = [];
    this.polydone = false;
    this.lastdot = null;
    this.triangulation = [];
    this.triDone = false;
  }

  getDistance(ptA, ptB) {
    const xs = ptA.x - ptB.x;
    const ys = ptA.y - ptB.y;

    return Math.sqrt((xs * xs) + (ys * ys));
  }

  getLocalMouse (evt) {
    const pt = this.svg.nativeElement.createSVGPoint();
    pt.x = evt.clientX || evt.originalEvent.touches[0].clientX;
    pt.y = evt.clientY || evt.originalEvent.touches[0].clientY;
    return pt.matrixTransform(this.svg.nativeElement.getScreenCTM().inverse());
  }

  formatDots() {
    return this.dots.map(d => `${d.x},${d.y}`).join(' ');
  }

  ngOnDestroy() {
    this._destroy.next();
    this._destroy.complete();
  }
}
