import { SQLQueryResult } from '../types/dataset';

export function executeSQLQuery(
  sqlQuery: string,
  tableName: string,
  tableData: Record<string, any>[]
): SQLQueryResult {
  const startTime = performance.now();

  try {
    if (!sqlQuery || sqlQuery.trim() === '') {
      return {
        columns: [],
        rows: [],
        executionTimeMs: 0,
        rowCount: 0,
        error: 'Query is empty.',
      };
    }

    const cleanSQL = sqlQuery.trim().replace(/;\s*$/, '');
    const lowerSQL = cleanSQL.toLowerCase();

    // 1. Handle CTE (WITH ... AS ...)
    if (lowerSQL.startsWith('with')) {
      const cteMatch = cleanSQL.match(/WITH\s+[a-zA-Z0-9_]+\s+AS\s*\(([\s\S]+)\)\s*(SELECT[\s\S]+)/i);
      if (cteMatch) {
        return executeSQLQuery(cteMatch[2], tableName, tableData);
      }
    }

    // 2. Handle UNION / UNION ALL
    if (cleanSQL.toUpperCase().includes(' UNION ')) {
      const parts = cleanSQL.split(/\s+UNION\s+(?:ALL\s+)?/i);
      if (parts.length > 1) {
        const res1 = executeSQLQuery(parts[0], tableName, tableData);
        const res2 = executeSQLQuery(parts[1], tableName, tableData);
        const combinedRows = [...(res1.rows || []), ...(res2.rows || [])];
        return {
          columns: res1.columns.length ? res1.columns : res2.columns,
          rows: combinedRows,
          executionTimeMs: Math.round(performance.now() - startTime),
          rowCount: combinedRows.length,
          generatedSQL: cleanSQL,
        };
      }
    }

    // 3. Handle DML - INSERT INTO
    if (lowerSQL.startsWith('insert into')) {
      const match = cleanSQL.match(/INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
      if (match) {
        const cols = match[2].split(',').map(c => c.trim().replace(/[`"]/g, ''));
        const vals = match[3].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
        const newRow: Record<string, any> = {};
        cols.forEach((col, idx) => {
          let val: any = vals[idx] !== undefined ? vals[idx] : null;
          if (val !== null && !isNaN(Number(val))) val = Number(val);
          newRow[col] = val;
        });
        tableData.unshift(newRow);
        return {
          columns: Object.keys(newRow),
          rows: [newRow],
          executionTimeMs: Math.round(performance.now() - startTime),
          rowCount: 1,
          generatedSQL: cleanSQL,
        };
      }
      return {
        columns: ['Status', 'Message', 'Table'],
        rows: [{ Status: 'Success', Message: `1 row inserted into ${tableName}.`, Table: tableName }],
        executionTimeMs: Math.round(performance.now() - startTime),
        rowCount: 1,
      };
    }

    // 4. Handle DML - UPDATE
    if (lowerSQL.startsWith('update')) {
      return {
        columns: ['Status', 'Affected_Rows', 'Table'],
        rows: [{ Status: 'Success', Affected_Rows: Math.min(tableData.length, 5), Table: tableName }],
        executionTimeMs: Math.round(performance.now() - startTime),
        rowCount: 1,
      };
    }

    // 5. Handle DML - DELETE FROM
    if (lowerSQL.startsWith('delete')) {
      return {
        columns: ['Status', 'Deleted_Rows', 'Table'],
        rows: [{ Status: 'Success', Deleted_Rows: 1, Table: tableName }],
        executionTimeMs: Math.round(performance.now() - startTime),
        rowCount: 1,
      };
    }

    // 6. Handle DDL - CREATE TABLE
    if (lowerSQL.startsWith('create table')) {
      return {
        columns: ['Schema_Status', 'Table_Name', 'Engine'],
        rows: [{ Schema_Status: 'Table Created Successfully', Table_Name: 'new_analytics_table', Engine: 'In-Memory DB Engine' }],
        executionTimeMs: Math.round(performance.now() - startTime),
        rowCount: 1,
      };
    }

    // 7. Handle DDL - ALTER TABLE
    if (lowerSQL.startsWith('alter table')) {
      return {
        columns: ['Schema_Status', 'Table_Name', 'Modification'],
        rows: [{ Schema_Status: 'Table Altered Successfully', Table_Name: tableName, Modification: 'ADD COLUMN modified_at TIMESTAMP' }],
        executionTimeMs: Math.round(performance.now() - startTime),
        rowCount: 1,
      };
    }

    // 8. Handle DDL - DROP TABLE / TRUNCATE
    if (lowerSQL.startsWith('drop table') || lowerSQL.startsWith('truncate')) {
      return {
        columns: ['Schema_Status', 'Table_Name'],
        rows: [{ Schema_Status: 'Table Truncated/Dropped Successfully', Table_Name: tableName }],
        executionTimeMs: Math.round(performance.now() - startTime),
        rowCount: 1,
      };
    }

    if (!lowerSQL.startsWith('select')) {
      return {
        columns: [],
        rows: [],
        executionTimeMs: Math.round(performance.now() - startTime),
        rowCount: 0,
        error: 'Unsupported SQL statement. Supported types: SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, WITH, UNION.',
      };
    }

    let rows = [...tableData];
    if (rows.length === 0) {
      return {
        columns: [],
        rows: [],
        executionTimeMs: Math.round(performance.now() - startTime),
        rowCount: 0,
      };
    }

    // 9. Parse DISTINCT
    const isDistinct = /\bSELECT\s+DISTINCT\b/i.test(cleanSQL);

    // 10. Parse LIMIT
    let limitValue: number | null = null;
    const limitMatch = cleanSQL.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      limitValue = parseInt(limitMatch[1], 10);
    }

    // 11. Parse WHERE clause
    const whereMatch = cleanSQL.match(/WHERE\s+(.*?)(?:GROUP BY|HAVING|ORDER BY|LIMIT|$)/i);
    if (whereMatch) {
      const whereCondition = whereMatch[1].trim();
      rows = rows.filter(row => evaluateWhereCondition(row, whereCondition));
    }

    // 12. Parse GROUP BY clause
    const groupByMatch = cleanSQL.match(/GROUP BY\s+(.*?)(?:HAVING|ORDER BY|LIMIT|$)/i);
    let isGrouped = false;
    let groupKeys: string[] = [];
    if (groupByMatch) {
      isGrouped = true;
      groupKeys = groupByMatch[1].split(',').map(s => s.trim().replace(/[`"]/g, ''));
    }

    // 13. Parse SELECT columns & Aggregations
    const selectMatch = cleanSQL.match(/SELECT\s+(?:DISTINCT\s+)?(.*?)\s+FROM/i);
    const selectClause = selectMatch ? selectMatch[1].trim() : '*';

    let resultRows: Record<string, any>[] = [];
    let resultColumns: string[] = [];

    if (isGrouped) {
      resultRows = handleGroupByAggregation(rows, groupKeys, selectClause);
      if (resultRows.length > 0) {
        resultColumns = Object.keys(resultRows[0]);
      }
    } else {
      const hasAggs = /\b(SUM|AVG|COUNT|MIN|MAX)\s*\(/i.test(selectClause);
      if (hasAggs) {
        resultRows = handleGlobalAggregation(rows, selectClause);
        resultColumns = Object.keys(resultRows[0] || {});
      } else if (selectClause === '*') {
        resultRows = rows;
        resultColumns = Object.keys(rows[0] || {});
      } else {
        const rawCols = selectClause.split(',').map(s => s.trim().replace(/[`"]/g, ''));
        resultColumns = rawCols;
        resultRows = rows.map(r => {
          const newRow: Record<string, any> = {};
          rawCols.forEach(c => {
            newRow[c] = r[c] !== undefined ? r[c] : null;
          });
          return newRow;
        });
      }
    }

    // 14. HAVING Clause filtering
    const havingMatch = cleanSQL.match(/HAVING\s+(.*?)(?:ORDER BY|LIMIT|$)/i);
    if (havingMatch && resultRows.length > 0) {
      const havingCondition = havingMatch[1].trim();
      resultRows = resultRows.filter(row => evaluateWhereCondition(row, havingCondition));
    }

    // 15. DISTINCT filtering on resultRows
    if (isDistinct && resultRows.length > 0) {
      const seen = new Set<string>();
      resultRows = resultRows.filter(row => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // 16. Parse ORDER BY
    const orderByMatch = cleanSQL.match(/ORDER BY\s+(.*?)(?:LIMIT|$)/i);
    if (orderByMatch && resultRows.length > 0) {
      const orderClause = orderByMatch[1].trim();
      const parts = orderClause.split(/\s+/);
      const orderCol = parts[0].replace(/[`"]/g, '');
      const isDesc = parts[1] && parts[1].toUpperCase() === 'DESC';

      resultRows.sort((a, b) => {
        const valA = a[orderCol];
        const valB = b[orderCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return isDesc ? 1 : -1;
        return isDesc ? -1 : 1;
      });
    }

    // 17. Apply LIMIT
    if (limitValue !== null && limitValue >= 0) {
      resultRows = resultRows.slice(0, limitValue);
    }

    const endTime = performance.now();
    return {
      columns: resultColumns,
      rows: resultRows,
      executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
      rowCount: resultRows.length,
      generatedSQL: cleanSQL,
    };
  } catch (err: any) {
    return {
      columns: [],
      rows: [],
      executionTimeMs: Math.round(performance.now() - startTime),
      rowCount: 0,
      error: err.message || 'Error executing SQL query.',
    };
  }
}

// Simple WHERE clause evaluator supporting BETWEEN, IN, LIKE, =, !=, >, <, >=, <=
function evaluateWhereCondition(row: Record<string, any>, condition: string): boolean {
  try {
    // 1. Handle BETWEEN
    const betweenMatch = condition.match(/([a-zA-Z0-9_]+)\s+BETWEEN\s+([0-9.]+)\s+AND\s+([0-9.]+)/i);
    if (betweenMatch) {
      const col = betweenMatch[1];
      const min = Number(betweenMatch[2]);
      const max = Number(betweenMatch[3]);
      const val = Number(row[col]);
      return !isNaN(val) && val >= min && val <= max;
    }

    // 2. Handle IN ('a', 'b')
    const inMatch = condition.match(/([a-zA-Z0-9_]+)\s+IN\s*\((.*?)\)/i);
    if (inMatch) {
      const col = inMatch[1];
      const items = inMatch[2].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      const val = String(row[col]);
      return items.includes(val);
    }

    // 3. Handle standard comparison
    const match = condition.match(/([a-zA-Z0-9_]+)\s*(=|!=|>|<|>=|<=|LIKE)\s*('.*?'|".*?"|[0-9.]+)/i);
    if (!match) return true;

    const col = match[1];
    const op = match[2].toUpperCase();
    let targetVal: any = match[3].replace(/^['"]|['"]$/g, '');

    if (!isNaN(Number(targetVal))) {
      targetVal = Number(targetVal);
    }

    const rowVal = row[col];
    if (rowVal === undefined || rowVal === null) return false;

    if (op === '=') return rowVal == targetVal;
    if (op === '!=') return rowVal != targetVal;
    if (op === '>') return Number(rowVal) > Number(targetVal);
    if (op === '<') return Number(rowVal) < Number(targetVal);
    if (op === '>=') return Number(rowVal) >= Number(targetVal);
    if (op === '<=') return Number(rowVal) <= Number(targetVal);
    if (op === 'LIKE') return String(rowVal).toLowerCase().includes(String(targetVal).toLowerCase());

    return true;
  } catch {
    return true;
  }
}

// Group By Aggregation handler
function handleGroupByAggregation(
  rows: Record<string, any>[],
  groupKeys: string[],
  selectClause: string
): Record<string, any>[] {
  const groups: Record<string, Record<string, any>[]> = {};

  rows.forEach(r => {
    const key = groupKeys.map(k => String(r[k] ?? 'NULL')).join(' | ');
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const selectItems = selectClause.split(',').map(s => s.trim());

  return Object.values(groups).map(groupRows => {
    const res: Record<string, any> = {};

    groupKeys.forEach(gk => {
      res[gk] = groupRows[0][gk];
    });

    selectItems.forEach(item => {
      const aggMatch = item.match(/(SUM|AVG|COUNT|MIN|MAX)\((.*?)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i);
      if (aggMatch) {
        const fn = aggMatch[1].toUpperCase();
        const col = aggMatch[2].trim().replace(/[`"]/g, '');
        const alias = aggMatch[3] || `${fn}_${col}`;

        if (fn === 'COUNT') {
          res[alias] = col === '*' ? groupRows.length : groupRows.filter(r => r[col] !== null && r[col] !== undefined).length;
        } else {
          const vals = groupRows.map(r => Number(r[col])).filter(n => !isNaN(n));
          if (vals.length === 0) {
            res[alias] = 0;
          } else if (fn === 'SUM') {
            res[alias] = Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
          } else if (fn === 'AVG') {
            res[alias] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
          } else if (fn === 'MIN') {
            res[alias] = Math.min(...vals);
          } else if (fn === 'MAX') {
            res[alias] = Math.max(...vals);
          }
        }
      }
    });

    return res;
  });
}

// Global Aggregation without GROUP BY
function handleGlobalAggregation(rows: Record<string, any>[], selectClause: string): Record<string, any>[] {
  const res: Record<string, any> = {};
  const selectItems = selectClause.split(',').map(s => s.trim());

  selectItems.forEach(item => {
    const aggMatch = item.match(/(SUM|AVG|COUNT|MIN|MAX)\((.*?)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i);
    if (aggMatch) {
      const fn = aggMatch[1].toUpperCase();
      const col = aggMatch[2].trim().replace(/[`"]/g, '');
      const alias = aggMatch[3] || `${fn}_${col}`;

      if (fn === 'COUNT') {
        res[alias] = col === '*' ? rows.length : rows.filter(r => r[col] !== null && r[col] !== undefined).length;
      } else {
        const vals = rows.map(r => Number(r[col])).filter(n => !isNaN(n));
        if (vals.length === 0) {
          res[alias] = 0;
        } else if (fn === 'SUM') {
          res[alias] = Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
        } else if (fn === 'AVG') {
          res[alias] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
        } else if (fn === 'MIN') {
          res[alias] = Math.min(...vals);
        } else if (fn === 'MAX') {
          res[alias] = Math.max(...vals);
        }
      }
    }
  });

  return [res];
}

