-- GST invoices must carry a gapless, sequential number per financial year.
-- A Postgres sequence is the only way to get that safely under concurrency;
-- counting existing rows would race and reuse numbers.
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1 INCREMENT 1;
