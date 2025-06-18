import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StatsComponent } from './components/stats/stats.component';
import { AgencySummaryComponent } from './components/stats/agency-summary/agency-summary.component';
import { ReconciliationResultsComponent } from './components/reconciliation-results/reconciliation-results.component';

const routes: Routes = [
  { path: '', component: StatsComponent },
  { path: 'stats', component: StatsComponent },
  { path: 'agency-summary', component: AgencySummaryComponent },
  { path: 'results', component: ReconciliationResultsComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 