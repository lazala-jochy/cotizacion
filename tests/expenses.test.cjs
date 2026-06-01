const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  computeDocumentProfitability,
  sumProductCost,
  sumExpenses,
} = require('../server/expenses/profitCalculation');

describe('computeDocumentProfitability', () => {
  test('calcula utilidad neta con costos y gastos', () => {
    const doc = { subtotal: 500000, descuento: 0, itbis: 90000, total: 590000 };
    const items = [{ cantidad: 10, costo_unitario: 40000, precio_unitario: 50000 }];
    const expenses = [
      { amount: 10000 },
      { amount: 15000 },
      { amount: 5000 },
    ];
    const p = computeDocumentProfitability(doc, items, expenses);
    assert.strictEqual(p.revenue, 500000);
    assert.strictEqual(p.productCost, 400000);
    assert.strictEqual(p.expensesTotal, 30000);
    assert.strictEqual(p.grossProfit, 100000);
    assert.strictEqual(p.netProfit, 70000);
    assert.ok(Math.abs(p.marginPercent - 14) < 0.01);
  });

  test('rechaza montos negativos en agregación de gastos', () => {
    assert.strictEqual(sumExpenses([{ amount: 100 }, { amount: 50 }]), 150);
  });

  test('suma costo de productos por línea', () => {
    const cost = sumProductCost([
      { cantidad: 2, costo_unitario: 100 },
      { cantidad: 1, costo_unitario: 50 },
    ]);
    assert.strictEqual(cost, 250);
  });
});

describe('validateExpensePayload', () => {
  test('exige monto positivo', () => {
    const { validateExpensePayload, ExpenseValidationError } = require('../server/expenses/validateExpense');
    assert.throws(
      () =>
        validateExpensePayload({
          description: 'Combustible',
          expense_date: '2025-01-01',
          category_id: 1,
          amount: 0,
        }),
      ExpenseValidationError
    );
  });

  test('exige descripción', () => {
    const { validateExpensePayload, ExpenseValidationError } = require('../server/expenses/validateExpense');
    assert.throws(
      () =>
        validateExpensePayload({
          description: '',
          expense_date: '2025-01-01',
          category_id: 1,
          amount: 100,
        }),
      ExpenseValidationError
    );
  });
});
