export interface Customer {
  id: string;
  name: string;
  document: string; 
  creditLimit: number; 
  currentDebt: number; 
  status: 'ACTIVE' | 'BLOCKED';
}