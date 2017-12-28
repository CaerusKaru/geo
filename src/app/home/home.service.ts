import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';

import * as pnltri from 'pnltri';

export interface Triangle {
  a: number;
  b: number;
  c: number;
  center: SVGPoint;
  neighbors: number[];
}

@Injectable()
export class HomeService {

  showDual: Observable<boolean>;
  showTriangulation: Observable<boolean>;
  pointA: Observable<boolean>;
  pointB: Observable<boolean>;
  lastDot: Observable<SVGPoint>;
  polyDone: Observable<boolean>;
  outlineDone: Observable<boolean>;
  dots: Observable<SVGPoint[]>;
  triangulation: Observable<Triangle[]>;
  pA: Observable<SVGPoint>;
  pB: Observable<SVGPoint>;
  centers: Observable<SVGPoint[]>;

  private _pointA = new BehaviorSubject<boolean>(false);
  private _pointB = new BehaviorSubject<boolean>(false);
  private _vertices = new BehaviorSubject<SVGPoint[]>([]);
  private _showDual = new BehaviorSubject<boolean>(true);
  private _showTriangulation = new BehaviorSubject<boolean>(false);
  private _lastDot = new BehaviorSubject<SVGPoint>(null);
  private _polyDone = new BehaviorSubject<boolean>(false);
  private _outlineDone = new BehaviorSubject<boolean>(false);
  private _triangulation = new BehaviorSubject<Triangle[]>([]);
  private _pA = new BehaviorSubject<SVGPoint>(null);
  private _pB = new BehaviorSubject<SVGPoint>(null);
  private _centers = new BehaviorSubject<SVGPoint[]>([]);

  private _adjList = [];
  private _createPoint: () => SVGPoint;

  constructor() {
    this.showDual = this._showDual.asObservable();
    this.showTriangulation = this._showTriangulation.asObservable();
    this.pointA = this._pointA.asObservable();
    this.pointB = this._pointB.asObservable();
    this.lastDot = this._lastDot.asObservable();
    this.dots = this._vertices.asObservable();
    this.polyDone = this._polyDone.asObservable();
    this.outlineDone = this._outlineDone.asObservable();
    this.triangulation = this._triangulation.asObservable();
    this.pA = this._pA.asObservable();
    this.pB = this._pB.asObservable();
    this.centers = this._centers.asObservable();
  }

  addVertex(pt: SVGPoint) {
    const vertices = this._vertices.getValue();
    const pointA = this._pointA.getValue();
    const pointB = this._pointB.getValue();
    const polyDone = this._polyDone.getValue();
    if (polyDone) {
      return;
    }
    if (pointA) {
      if (!this._insidePolygon(pt, vertices)) {
        return;
      }
      this._pA.next(pt);
      this._pointA.next(false);
      this._pointB.next(true);
      return;
    }
    if (pointB) {
      if (!this._insidePolygon(pt, vertices)) {
        return;
      }
      this._pB.next(pt);
      this._pointB.next(false);
      this._polyDone.next(true);
      return;
    }
    if (vertices.length > 0 && this._getDistance(vertices[0], pt) < 20) {
      pt = vertices[0];
      this._outlineDone.next(true);
      this._pointA.next(true);
      this._adjList[0].push(vertices.length - 1);
      this._adjList[vertices.length - 1].push(0);
    } else {
      if (!this._checkNewLine(pt)) {
        return;
      }
      this._adjList.push([]);
      if (vertices.length > 1) {
        this._adjList[vertices.length - 1].push(vertices.length);
        this._adjList[vertices.length].push(vertices.length - 1);
      }
    }
    vertices.push(pt);
    this._vertices.next(vertices);
    this._lastDot.next(pt);
  }

  getTriangle(tri: Triangle) {
    if (!this._showTriangulation.getValue()) {
      return '';
    }
    const vertices = this._vertices.getValue();
    const triA = vertices[tri.a];
    const triB = vertices[tri.b];
    const triC = vertices[tri.c];
    return `${triA.x},${triA.y} ${triB.x},${triB.y} ${triC.x},${triC.y} ${triA.x},${triA.y}`;
  }

  setDual(sd: boolean) {
    this._showDual.next(sd);
  }

  setTriangulation(st: boolean) {
    this._showTriangulation.next(st);
  }

  setCreatePoint(cp: () => SVGPoint, ctx) {
    this._createPoint = cp.bind(ctx);
  }

  clear() {
    this._vertices.next([]);
    this._polyDone.next(false);
    this._lastDot.next(null);
    this._triangulation.next([]);
    // this._triDone.next(false);
    this._pointA.next(false);
    this._pointB.next(false);
    this._adjList = [];
    this._pA.next(null);
    this._pB.next(null);
    this._centers.next([]);
    this._outlineDone.next(false);
  }

  undo() {
    const vertices = this._vertices.getValue();
    const pointA = this._pointA.getValue();
    const pointB = this._pointB.getValue();
    const polyDone = this._polyDone.getValue();
    if (polyDone) {
      this._polyDone.next(false);
      this._triangulation.next([]);
      this._centers.next([]);
      this._pointB.next(true);
      this._pB.next(null);
      return;
    }
    if (pointB) {
      this._pointB.next(false);
      this._pointA.next(true);
      this._pA.next(null);
      return;
    }
    if (pointA) {
      this._pointA.next(false);
      this._outlineDone.next(false);
    }
    if (vertices.length <= 1) {
      return;
    }
    const ld = vertices[vertices.length - 2];
    vertices.splice(vertices.length - 1, 1);
    this._vertices.next(vertices);
    this._lastDot.next(ld);
  }

  triangulate() {
    const triangulator = new pnltri.Triangulator();
    const triTask = triangulator.triangulate_polygon([this._vertices.getValue()]);
    this._triangulation.next(triTask.map(t => {
      return {a: t[0], b: t[1], c: t[2], center: 0, neighbors: []};
    }));
    // this.triDone = true;
    this._calcCenters();
  }

  private _checkInterior(tri: Triangle, pt: SVGPoint) {
    const vertices = this._vertices.getValue();
    const triA = vertices[tri.a];
    const triB = vertices[tri.b];
    const triC = vertices[tri.c];
    const area = (a, b, c) => {
      return ((a.x * (b.y - c.y)) + (b.x * (c.y - a.y)) + (c.x * (a.y - b.y))) / 2;
    };

    const refArea = area(triA, triB, triC);
    const areaA = area(pt, triB, triC);
    const areaB = area(triA, pt, triC);
    const areaC = area(triA, triB, pt);

    return refArea === areaA && refArea === areaB && refArea === areaC;
  }

  private _findCenter(tri: Triangle) {
    const vertices = this._vertices.getValue();
    const triA = vertices[tri.a];
    const triB = vertices[tri.b];
    const triC = vertices[tri.c];
    const x = (triA.x + triB.x + triC.x) / 3;
    const y = (triA.y + triB.y + triC.y) / 3;
    const pt = this._createPoint();
    pt.x = x;
    pt.y = y;
    return pt;
  }

  private _calcCenters() {
    const triangulation = this._triangulation.getValue();
    const centers = [];
    triangulation.forEach((t, i) => {
      t.center = this._findCenter(t);
      centers.push(t.center);
      triangulation.forEach((e, j) => {
        if (i === j) {
          return;
        }
        const conA = e.a === t.a || e.b === t.a || e.c === t.a;
        const conB = e.a === t.b || e.b === t.b || e.c === t.b;
        const conC = e.a === t.c || e.b === t.c || e.c === t.c;

        const neighbors = conA && (conB || conC) || (conB && conC);
        if (neighbors) {
          t.neighbors.push(j);
          e.neighbors.push(i);
        }
      });
    });

    this._centers.next(centers);
    this._triangulation.next(triangulation);
  }

  private _getDistance(ptA, ptB) {
    const xs = ptA.x - ptB.x;
    const ys = ptA.y - ptB.y;

    return Math.sqrt((xs * xs) + (ys * ys));
  }

  private _insidePolygon(pt: SVGPoint, polygon: SVGPoint[]) {
    return this._windingNumber(pt, polygon) !== 0;
  }

  private _ccw(A: SVGPoint, B: SVGPoint, C: SVGPoint) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  }

  private _checkNewLine(pt: SVGPoint) {
    const lastDot = this._lastDot.getValue();
    const vertices = this._vertices.getValue();
    for (let i = 0; i < vertices.length - 1; i++) {
      if (this._lineIntersect(vertices[i], vertices[i + 1], lastDot, pt)) {
        return false;
      }
    }

    return true;
  }

  private _lineIntersect(A: SVGPoint, B: SVGPoint, C: SVGPoint, D: SVGPoint) {
    if (B.x === C.x && B.y === C.y) {
      return false;
    }
    return this._ccw(A, C, D) !== this._ccw(B, C, D) && this._ccw(A, B, C) !== this._ccw(A, B, D);
  }

  /**
   * isLeft - tests if a point is Left|On|Right of an infinite line
   * @param {SVGPoint} p0
   * @param {SVGPoint} p1
   * @param {SVGPoint} p2
   * @returns {number}
   * >0 for p2 left of the line through p0 and p1
   * =0 for p2  on the line
   * <0 for p2  right of the line
   * Credit to http://geomalgorithms.com/a03-_inclusion.html
   * @private
   */
  private _isLeft(p0: SVGPoint, p1: SVGPoint, p2: SVGPoint) {
    return ((p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y));
  }

  /**
   * windingNumber - winding number test for a point in a polygon
   * @param {SVGPoint} pt
   * @param {SVGPoint[]} pts
   * @returns {number}
   * =0 only when P is outside
   * Credit to http://geomalgorithms.com/a03-_inclusion.html
   * @private
   */
  private _windingNumber(pt: SVGPoint, pts: SVGPoint[]) {
    let wn = 0;    // the  winding number counter

    // loop through all edges of the polygon
    for (let i = 0; i < pts.length - 1; i++) {   // edge from V[i] to  V[i+1]
      if (pts[i].y <= pt.y) {          // start y <= P.y
        if (pts[i + 1].y > pt.y) {     // an upward crossing
          if (this._isLeft(pts[i], pts[i + 1], pt) > 0) { // P left of  edge
            ++wn; // have  a valid up intersect
          }
        }
      } else {                        // start y > P.y (no test needed)
        if (pts[i + 1].y <= pt.y) { // a downward crossing
          if (this._isLeft(pts[i], pts[i + 1], pt) < 0) { // P right of  edge
            --wn;            // have  a valid down intersect
          }
        }
      }
    }
    return wn;
  }

}
