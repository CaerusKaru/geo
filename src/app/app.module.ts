import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import {MaterialModule} from './material.module';
import {FlexLayoutModule} from '@angular/flex-layout';
import {HomeComponent} from './home/home.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {VizComponent} from './home/viz/viz.component';
import {RefComponent} from './ref/ref.component';
import {DiscComponent} from './disc/disc.component';
import {FormsModule} from '@angular/forms';
import {HomeService} from './home/home.service';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    VizComponent,
    RefComponent,
    DiscComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    AppRoutingModule,
    MaterialModule,
    FlexLayoutModule,
    FormsModule,
  ],
  providers: [
    HomeService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
