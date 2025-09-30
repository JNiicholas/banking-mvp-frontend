import { Routes } from '@angular/router';
import { Frontpage } from './pages/frontpage/frontpage';
import { AccountOverview } from './components/account-overview/account-overview';
import { authGuard } from './guards/auth.guard';
import { AccountTransactions } from './components/account-transactions/account-transactions';

import { ListCustomers } from './components/admin/list-customers/list-customers';
import { NewAccount } from './components/admin/new-account/new-account';
import { NewCustomer } from './components/admin/new-customer/new-customer';



export const routes: Routes = [
//  { path: '', pathMatch: 'full', children: [] },
  { path: '', component: Frontpage },
  { path: 'customer/my-accounts', component: AccountOverview, canActivate: [authGuard] },
  { path: 'admin/list-customers', component: ListCustomers, canActivate: [authGuard] },
  { path: 'admin/accounts/new', component: NewAccount, canActivate: [authGuard] },
  { path: 'admin/customers/new', component: NewCustomer, canActivate: [authGuard] },
  { path: 'accounts/:id/transactions', component: AccountTransactions, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];

