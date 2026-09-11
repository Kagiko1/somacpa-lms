-- SomaCPA seed: 3 courses, CA11 fully fleshed out (2 modules, 3 lessons, 1 quiz).
-- Run AFTER 001_initial_schema.sql.

-- ---------- Courses ----------
insert into courses (paper_code, title, level, description, price_kes) values
  ('CA11', 'Financial Accounting', 'Foundation',
   'Double entry, books of original entry, and financial statements for sole traders, partnerships and companies.',
   2500),
  ('CA23', 'Financial Reporting and Analysis', 'Intermediate',
   'Preparation and analysis of financial statements under IFRS, including group accounts.',
   3500),
  ('CA26', 'Public Finance and Taxation', 'Intermediate',
   'Kenyan public finance, KRA tax administration, PAYE, VAT, income tax and eTIMS compliance.',
   3500)
on conflict (paper_code) do nothing;

-- ---------- CA11 modules ----------
with c as (select id from courses where paper_code = 'CA11')
insert into modules (course_id, title, order_index)
select c.id, m.title, m.ord from c cross join (values
  ('The Accounting Equation and Double Entry', 0),
  ('Books of Original Entry and Ledgers', 1)
) as m(title, ord)
on conflict (course_id, order_index) do nothing;

-- ---------- CA11 lessons ----------
with m as (select id, order_index from modules where course_id = (select id from courses where paper_code='CA11'))
insert into lessons (module_id, title, content_markdown, order_index, is_free_preview)
select m.id, l.title, l.body, l.ord, l.free from m join (values
  ('What is accounting? The accounting equation', 0, true,
   '# What is accounting?' || chr(10) || chr(10) ||
   'Accounting is the language of business. At its heart sits one equation:' || chr(10) || chr(10) ||
   '**Assets = Capital + Liabilities**' || chr(10) || chr(10) ||
   '## Why it matters for KASNEB' || chr(10) ||
   'Every CA11 question — from sole traders to partnerships — is solved by applying this equation. ' ||
   'If the equation does not balance, your workings are wrong. Full stop.' || chr(10) || chr(10) ||
   '## Worked example (KES)' || chr(10) ||
   'Wanjiku starts a business with KES 500,000 cash and a KES 200,000 bank loan. She buys stock for KES 150,000 cash.' || chr(10) || chr(10) ||
   '- Assets = 500,000 (cash) − 150,000 + 150,000 (stock) + 200,000 (loan cash) = **700,000**' || chr(10) ||
   '- Capital + Liabilities = 500,000 + 200,000 = **700,000** ✓' || chr(10) || chr(10) ||
   '> Exam tip: KASNEB loves asking you to *prove* the equation after a transaction. Show both sides.'),
  ('Double-entry rules: debits and credits', 1, false,
   '# Double-entry rules' || chr(10) || chr(10) ||
   'Every transaction hits **two** accounts:' || chr(10) || chr(10) ||
   '- **Debit** the account that *receives* value' || chr(10) ||
   '- **Credit** the account that *gives* value' || chr(10) || chr(10) ||
   '## The DEALER shortcut' || chr(10) ||
   '**D**ividends, **E**xpenses, **A**ssets → Debit to increase.' || chr(10) ||
   '**L**iabilities, **E**quity, **R**evenue → Credit to increase.' || chr(10) || chr(10) ||
   '## Example' || chr(10) ||
   'Buy office furniture for KES 80,000 cash:' || chr(10) ||
   '- Dr Furniture (asset ↑) 80,000' || chr(10) ||
   '- Cr Cash (asset ↓) 80,000')
) as l(title, ord, free, body) on m.order_index = 0
on conflict (module_id, order_index) do nothing;

with m as (select id from modules where course_id = (select id from courses where paper_code='CA11') and order_index = 1)
insert into lessons (module_id, title, content_markdown, order_index, is_free_preview)
select m.id,
  'Sales day book, purchases day book and the ledger',
  '# Books of original entry' || chr(10) || chr(10) ||
  'Transactions are first recorded in **books of original entry**, then posted to the **ledger**.' || chr(10) || chr(10) ||
  '| Book | Records |' || chr(10) || '|---|---|' || chr(10) ||
  '| Sales day book | Credit sales |' || chr(10) ||
  '| Purchases day book | Credit purchases |' || chr(10) ||
  '| Cash book | Cash and bank |' || chr(10) ||
  '| General journal | Everything else |' || chr(10) || chr(10) ||
  '## Posting to the ledger' || chr(10) ||
  'Totals from day books are posted: sales day book total → **Cr Sales account, Dr Receivables**. ' ||
  'Get the direction wrong and the trial balance will not agree — the classic CA11 trap.',
  0, false
from m
on conflict (module_id, order_index) do nothing;

-- ---------- CA11 quiz on module 1 ----------
with m as (select id from modules where course_id = (select id from courses where paper_code='CA11') and order_index = 0)
insert into quizzes (module_id, title)
select m.id, 'Module 1 checkpoint: accounting equation & double entry' from m
on conflict do nothing;

with q as (select id from quizzes where title = 'Module 1 checkpoint: accounting equation & double entry')
insert into questions (quiz_id, qtype, question_text, options, correct_answer, explanation_markdown, order_index)
select q.id, v.qtype::question_type, v.qtext, v.opts, v.ans, v.expl, v.ord from q cross join (values
  ('mcq',
   'A business has assets of KES 1,200,000 and liabilities of KES 450,000. What is the capital?',
   '["A) KES 750,000", "B) KES 1,650,000", "C) KES 450,000", "D) KES 1,200,000"]'::jsonb,
   'A) KES 750,000',
   'Capital = Assets − Liabilities = 1,200,000 − 450,000 = **750,000**. Rearranging the accounting equation is the single most-tested CA11 skill.',
   0),
  ('mcq',
   'A credit sale of KES 60,000 is correctly recorded as:',
   '["A) Dr Cash, Cr Sales", "B) Dr Receivables, Cr Sales", "C) Dr Sales, Cr Receivables", "D) Dr Payables, Cr Purchases"]'::jsonb,
   'B) Dr Receivables, Cr Sales',
   'The business *receives* a receivable (asset ↑ → debit) and *gives* goods (revenue ↑ → credit). Option A is for a **cash** sale — the classic distractor.',
   1),
  ('mcq',
   'Which of the following increases with a debit entry?',
   '["A) Loan payable", "B) Sales revenue", "C) Motor vehicles", "D) Capital"]'::jsonb,
   'C) Motor vehicles',
   'DEALER: Dividends, Expenses, Assets take debits. Motor vehicles is an asset. The other three are L/E/R — credit to increase.',
   2),
  ('theory',
   'Explain, with one worked example in KES, why every business transaction must keep the accounting equation balanced.',
   null, null,
   '## Grading rubric (10 marks)' || chr(10) ||
   '- States the equation Assets = Capital + Liabilities (2)' || chr(10) ||
   '- Explains duality: every transaction has two equal and opposite effects (3)' || chr(10) ||
   '- Worked example with correct figures on both sides (3)' || chr(10) ||
   '- Concludes that imbalance signals an error in recording (2)',
   3)
) as v(qtype, qtext, opts, ans, expl, ord)
on conflict do nothing;
