import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {MatCheckboxChange} from '@angular/material';
import {HomeService} from './home.service';

@Component({
  selector: 'geo-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {

  showTriangulation: Observable<boolean>;
  showDual: Observable<boolean>;

  constructor(private _homeService: HomeService) {
    this.showTriangulation = _homeService.showTriangulation;
    this.showDual = _homeService.showDual;
  }

  ngOnInit() {
  }

  triangulate() {
    this._homeService.triangulate();
  }

  clear() {
    this._homeService.clear();
  }

  undo() {
    this._homeService.undo();
  }

  updateCheck(evt: MatCheckboxChange) {
    if (evt.source.id === 'tri') {
      this._homeService.setTriangulation(evt.checked);
    } else if (evt.source.id === 'dual') {
      this._homeService.setDual(evt.checked);
    }
  }

}
