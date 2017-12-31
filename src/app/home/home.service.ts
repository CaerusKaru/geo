import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {from} from 'rxjs/observable/from';

import * as pnltri from 'pnltri';

export interface Triangle {
  a: number;
  dA: SVGPoint;
  b: number;
  dB: SVGPoint;
  c: number;
  dC: SVGPoint;
  center: SVGPoint;
  children: number[];
}

interface Edge {
  a: number;
  b: number;
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
  shortestPath: Observable<SVGPoint[]>;

  private _pointA = new BehaviorSubject<boolean>(false);
  private _pointB = new BehaviorSubject<boolean>(false);
  private _vertices = new BehaviorSubject<SVGPoint[]>([]);
  private _showDual = new BehaviorSubject<boolean>(true);
  private _showTriangulation = new BehaviorSubject<boolean>(true);
  private _lastDot = new BehaviorSubject<SVGPoint>(null);
  private _polyDone = new BehaviorSubject<boolean>(false);
  private _outlineDone = new BehaviorSubject<boolean>(false);
  private _triangulation = new BehaviorSubject<Triangle[]>([]);
  private _pA = new BehaviorSubject<SVGPoint>(null);
  private _pB = new BehaviorSubject<SVGPoint>(null);
  private _shortestPath = new BehaviorSubject<SVGPoint[]>([]);

  private _adjList = [];
  private _createPoint: () => SVGPoint;
  private _triangleA: number;
  private _triangleB: number;
  private _dualTreeRoot: number;

  constructor() {
    this.showDual = from(this._showDual);
    this.showTriangulation = from(this._showTriangulation);
    this.pointA = from(this._pointA);
    this.pointB = from(this._pointB);
    this.lastDot = from(this._lastDot);
    this.dots = from(this._vertices);
    this.polyDone = from(this._polyDone);
    this.outlineDone = from(this._outlineDone);
    this.triangulation = from(this._triangulation);
    this.shortestPath = from(this._shortestPath);
    this.pA = from(this._pA);
    this.pB = from(this._pB);
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
    this._outlineDone.next(false);
    this._shortestPath.next([]);
  }

  undo() {
    const vertices = this._vertices.getValue();
    const pointA = this._pointA.getValue();
    const pointB = this._pointB.getValue();
    const polyDone = this._polyDone.getValue();
    if (polyDone) {
      this._shortestPath.next([]);
      this._polyDone.next(false);
      this._triangulation.next([]);
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
      return {
        a: t[0],
        dA: this._findMid(t[0], t[1]),
        b: t[1],
        dB: this._findMid(t[1], t[2]),
        c: t[2],
        dC: this._findMid(t[2], t[0]),
        center: this._findCenter(t),
        children: []
      };
    }));

    this._findSource();
    this._buildTree();
    this._findPaths(this._BFS()); // list of triangles for the subpolygon
  }

  private _findPaths(subPolygon: number[]) {

    const triangulation = this._triangulation.getValue();
    const vertices = this._vertices.getValue();
    const dest = this._pB.getValue();
    const portals: Edge[] = [];

    const containsEdge = (tri, a, b) => {
      return (a === tri.a || a === tri.b || a === tri.c) && (b === tri.a || b === tri.b || b === tri.c);
    };

    const addPortal = (prevPortal, a, b, i) => {
      if (prevPortal != null) {
        const prevA = prevPortal.a === a || prevPortal.a === b;

        portals[i] = prevA ?
          {
            a: prevPortal.a === a ? a : b,
            b: prevPortal.a === a ? b : a
          }
          :
          {
            a: prevPortal.b === a ? b : a,
            b: prevPortal.b === a ? a : b
          };
      } else {
        portals[i] = {a, b};
      }
    };

    const crossProduct = (a, b, c) => {
      return ((b.x - a.x) * (c.y - a.y)) - ((b.y - a.y) * (c.x - a.x));
    };

    const shortestPath = [this._pA.getValue()];
    let apex = this._pA.getValue();

    for (let i = 1; i < subPolygon.length; i++) {
      const triA = triangulation[subPolygon[i - 1]];
      const triB = triangulation[subPolygon[i]];
      const prevPortal = portals[i];

      if (containsEdge(triB, triA.a, triA.b)) {
        addPortal(prevPortal, triA.a, triA.b, i);
      }

      if (containsEdge(triB, triA.b, triA.c)) {
        addPortal(prevPortal, triA.b, triA.c, i);
      }

      if (containsEdge(triB, triA.c, triA.a)) {
        addPortal(prevPortal, triA.c, triA.a, i);
      }
    }

    portals.push({a: -1, b: -1});

    let left = portals.length > 1 ? portals[1].a : null;
    let right = portals.length > 1 ? portals[1].b : null;

    for (let i = 1; i < portals.length - 1; i++) {
      const nextPortal = portals[i + 1];

      if (nextPortal.a !== left) {
        if (crossProduct(apex, vertices[left], nextPortal.a !== -1 ? vertices[nextPortal.a] : dest) >= 0) {
          if (crossProduct(apex, vertices[right], nextPortal.a !== -1 ? vertices[nextPortal.a] : dest) >= 0) {
            shortestPath.push(vertices[right]);
            apex = vertices[right];
            left = nextPortal.a;
          } else {
            left = nextPortal.a;
            if (left === -1) {
              break;
            }
          }
        }
      }

      if (nextPortal.b !== right) {
        if (crossProduct(apex, vertices[right], nextPortal.b !== -1 ? vertices[nextPortal.b] : dest) <= 0) {
          if (crossProduct(apex, vertices[left], nextPortal.b !== -1 ? vertices[nextPortal.b] : dest) <= 0) {
            shortestPath.push(vertices[left]);
            apex = vertices[left];
            right = nextPortal.b;
          } else {
            right = nextPortal.b;
            if (right === -1) {
              break;
            }
          }
        }
      }
    }

    shortestPath.push(this._pB.getValue());
    this._shortestPath.next(shortestPath);
  }

  private _findSource() {
    const triangulation = this._triangulation.getValue();
    const vertices = this._vertices.getValue();
    const pointA = this._pA.getValue();
    const pointB = this._pB.getValue();
    triangulation.forEach((tri, i) => {
      const triVerts = [vertices[tri.a], vertices[tri.b], vertices[tri.c], vertices[tri.a]];
      if (this._insidePolygon(pointA, triVerts)) {
        this._triangleA = i;
      }
      if (this._insidePolygon(pointB, triVerts)) {
        this._triangleB = i;
      }
    });
  }

  private _buildTree() {
    const triangulation = this._triangulation.getValue();
    const vertices = this._vertices.getValue();

    const adjMatrix = [];

    vertices.forEach((v, i) => {
      adjMatrix[i] = [];
    });

    const checkEdge = (tri, a, b, i) => {
      if (adjMatrix[a][b] != null) {
        tri.children.push(adjMatrix[a][b]);
        triangulation[adjMatrix[a][b]].children.push(i);
      } else {
        adjMatrix[a][b] = i;
        adjMatrix[b][a] = i;
      }
    };

    triangulation.forEach((tri, i) => {
      checkEdge(tri, tri.a, tri.b, i);
      checkEdge(tri, tri.b, tri.c, i);
      checkEdge(tri, tri.c, tri.a, i);
    });

    this._triangulation.next(triangulation);
  }

  private _BFS() {
    const triangulation = this._triangulation.getValue();

    const visited = [];
    const queue = [this._triangleA];
    visited[this._triangleA] = true;
    const subPolygon = [];
    const parents = [];

    while (queue.length > 0) {
      const tri = queue.shift();
      if (tri === this._triangleB) {
        break;
      }

      visited[tri] = true;
      triangulation[tri].children.forEach(c => {
        if (!visited[c]) {
          parents[c] = tri;
          queue.push(c);
        }
      });
    }

    let current = this._triangleB;
    subPolygon.push(current);
    while (true) {
      current = parents[current];
      if (current != null) {
        subPolygon.push(current);
      }
      if (current === this._triangleA || !current) {
        break;
      }
    }

    return subPolygon.reverse();
  }

  private _findCenter(tri) {
    const vertices = this._vertices.getValue();
    const triA = vertices[tri[0]];
    const triB = vertices[tri[1]];
    const triC = vertices[tri[2]];
    const x = (triA.x + triB.x + triC.x) / 3;
    const y = (triA.y + triB.y + triC.y) / 3;
    const pt = this._createPoint();
    pt.x = x;
    pt.y = y;
    return pt;
  }

  private _findMid(pA, pB) {
    const vertices = this._vertices.getValue();
    const pointA = vertices[pA];
    const pointB = vertices[pB];
    const pt = this._createPoint();
    pt.x = (pointA.x + pointB.x) / 2;
    pt.y = (pointA.y + pointB.y) / 2;

    return pt;
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
