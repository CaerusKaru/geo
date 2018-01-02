import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import {Subject} from 'rxjs/Subject';

import {HomeService, Triangle} from '../home.service';
import {takeUntil} from 'rxjs/operators/takeUntil';

@Component({
  selector: 'geo-viz',
  templateUrl: './viz.component.html',
  styleUrls: ['./viz.component.scss']
})
export class VizComponent implements OnInit, OnDestroy {

  @ViewChild('viz') svg: ElementRef;

  showTriangulation = this._homeService.showTriangulation;
  showDual = this._homeService.showDual;
  showSubPolygon = this._homeService.showSubPolygon;
  polyDone = this._homeService.polyDone;
  outlineDone = this._homeService.outlineDone;
  lastDot = this._homeService.lastDot;
  pointA = this._homeService.pointA;
  pointB = this._homeService.pointB;
  pA = this._homeService.pA;
  pB = this._homeService.pB;
  triangulation = this._homeService.triangulation;
  dots = this._homeService.dots;
  shortestPath = this._homeService.shortestPath;
  subPolygon = this._homeService.subPolygon;

  // triDone = this._homeService.triDone;

  mouseActive = false;
  cursorX = 0;
  cursorY = 0;

  private _destroy = new Subject<void>();

  @HostListener('mouseenter')
  mouseenter() {
    this.mouseActive = true;
  }

  @HostListener('mouseleave')
  mouseleave() {
    this.mouseActive = false;
  }

  @HostListener('mousemove', ['$event'])
  @HostListener('touchmove', ['$event'])
  mousemove(evt: MouseEvent|TouchEvent) {
    if (!this.mouseActive) {
      return;
    }
    const pt = this._getLocalMouse(evt);
    this.cursorX = pt.x;
    this.cursorY = pt.y;
  }

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onclick(evt: MouseEvent|TouchEvent) {
    if (!this.mouseActive) {
      return;
    }
    const pt = this._getLocalMouse(evt);
    this._homeService.addVertex(pt);
  }

  constructor(private renderer: Renderer2, private _homeService: HomeService) {}

  ngOnInit() {
    this.polyDone.pipe(takeUntil(this._destroy)).subscribe(d => {
      const style = d ? 'auto' : 'none';
      this.renderer.setStyle(this.svg.nativeElement, 'cursor', style);
    });
    this._homeService.setCreatePoint(this.svg.nativeElement.createSVGPoint, this.svg.nativeElement);
  }

  getTri(triangle: Triangle) {
    return this._homeService.getTriangle(triangle);
  }

  formatDots(dots: SVGPoint[]) {
    return dots.map(d => `${d.x},${d.y}`).join(' ');
  }

  ngOnDestroy() {
    this._destroy.next();
    this._destroy.complete();
  }

  private _getLocalMouse(evt: MouseEvent|TouchEvent) {
    const pt = this.svg.nativeElement.createSVGPoint();
    pt.x = (evt as MouseEvent).clientX || (evt as TouchEvent).changedTouches[0].clientX;
    pt.y = (evt as MouseEvent).clientY || (evt as TouchEvent).changedTouches[0].clientY;
    return pt.matrixTransform(this.svg.nativeElement.getScreenCTM().inverse());
  }
}
