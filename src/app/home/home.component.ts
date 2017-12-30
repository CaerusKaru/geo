import {Component, ViewEncapsulation} from '@angular/core';
import {MatCheckboxChange} from '@angular/material';
import {HomeService} from './home.service';

@Component({
  selector: 'geo-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent {

  showTriangulation = this._homeService.showTriangulation;
  showDual = this._homeService.showDual;

  constructor(private _homeService: HomeService) { }

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
