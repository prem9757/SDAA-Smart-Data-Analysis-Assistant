import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Play, 
  Sparkles, 
  Copy, 
  Check, 
  Table as TableIcon, 
  Code2, 
  Clock, 
  Lightbulb,
  Search,
  BookOpen,
  Plus,
  Zap,
  Filter,
  Layers,
  FileCode2,
  ListFilter
} from 'lucide-react';
import { Dataset, SQLQueryResult } from '../../types/dataset';
import { executeSQLQuery } from '../../utils/sqlEngine';

interface SQLExecutorProps {
  dataset: Dataset;
}

type CommandCategory = 'All' | 'Find & Filter' | 'Totals & Summaries' | 'Add & Edit' | 'Table Structure' | 'Combine Tables';

interface SQLCommandItem {
  id: string;
  category: CommandCategory;
  name: string;
  syntax: string;
  description: string;
  getSQL: (tableName: string, numericCol: string, catCol: string, allCols: string[]) => string;
}

export const SQLExecutor: React.FC<SQLExecutorProps> = ({ dataset }) => {
  const tableName = dataset.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  const numericCol = React.useMemo(() => {
    return dataset.columns.find(c => c.type === 'number')?.name || dataset.columns[1]?.name || 'value';
  }, [dataset.columns]);

  const catCol = React.useMemo(() => {
    return dataset.columns.find(c => c.type === 'string')?.name || dataset.columns[0]?.name || 'category';
  }, [dataset.columns]);

  const allColNames = React.useMemo(() => {
    return dataset.columns.map(c => c.name);
  }, [dataset.columns]);

  const [sqlInput, setSqlInput] = React.useState<string>(
    `SELECT * FROM \`${tableName}\` LIMIT 25;`
  );
  const [nlPrompt, setNlPrompt] = React.useState<string>('');
  const [isGeneratingSQL, setIsGeneratingSQL] = React.useState<boolean>(false);
  const [queryResult, setQueryResult] = React.useState<SQLQueryResult | null>(null);
  const [activeView, setActiveView] = React.useState<'table' | 'json'>('table');
  const [copied, setCopied] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<CommandCategory>('All');
  const [commandSearch, setCommandSearch] = React.useState<string>('');
  const [isCatalogOpen, setIsCatalogOpen] = React.useState<boolean>(true);

  // Comprehensive Catalog of SQL Commands
  const sqlCommandsCatalog: SQLCommandItem[] = React.useMemo(() => [
    // Find & Filter
    {
      id: 'select-all',
      category: 'Find & Filter',
      name: 'SELECT ALL (*)',
      syntax: 'SELECT * FROM table;',
      description: 'Fetch all rows and columns from the dataset.',
      getSQL: (t) => `SELECT * FROM \`${t}\` LIMIT 25;`,
    },
    {
      id: 'select-distinct',
      category: 'Find & Filter',
      name: 'SELECT DISTINCT',
      syntax: 'SELECT DISTINCT col FROM table;',
      description: 'Get unique items from a column without duplicates.',
      getSQL: (t, _, c) => `SELECT DISTINCT \`${c}\` FROM \`${t}\`;`,
    },
    {
      id: 'where-filter',
      category: 'Find & Filter',
      name: 'WHERE Filter',
      syntax: 'WHERE column = value',
      description: 'Filter rows based on specific conditions.',
      getSQL: (t, n) => `SELECT * FROM \`${t}\` WHERE \`${n}\` > 10;`,
    },
    {
      id: 'like-search',
      category: 'Find & Filter',
      name: 'LIKE Text Search',
      syntax: "WHERE column LIKE '%term%'",
      description: 'Search text for specific words or patterns.',
      getSQL: (t, _, c) => `SELECT * FROM \`${t}\` WHERE \`${c}\` LIKE '%a%';`,
    },
    {
      id: 'between-range',
      category: 'Find & Filter',
      name: 'BETWEEN Range Filter',
      syntax: 'WHERE column BETWEEN min AND max',
      description: 'Filter numbers within a minimum and maximum range.',
      getSQL: (t, n) => `SELECT * FROM \`${t}\` WHERE \`${n}\` BETWEEN 10 AND 500;`,
    },
    {
      id: 'in-list',
      category: 'Find & Filter',
      name: 'IN Value List',
      syntax: "WHERE column IN ('a', 'b')",
      description: 'Match rows with any item in a specific list.',
      getSQL: (t, _, c) => `SELECT * FROM \`${t}\` WHERE \`${c}\` IN ('Category A', 'Category B', 'Active');`,
    },
    {
      id: 'case-when',
      category: 'Find & Filter',
      name: 'CASE WHEN Rule',
      syntax: 'CASE WHEN cond THEN val ELSE default END',
      description: 'Create custom labels based on conditions.',
      getSQL: (t, n, c) => `SELECT \`${c}\`, \`${n}\`,\n  CASE WHEN \`${n}\` > 100 THEN 'High Tier'\n       ELSE 'Standard Tier'\n  END AS performance_bracket\nFROM \`${t}\` LIMIT 20;`,
    },
    {
      id: 'order-by',
      category: 'Find & Filter',
      name: 'ORDER BY Sort',
      syntax: 'ORDER BY column DESC',
      description: 'Sort results from highest to lowest or lowest to highest.',
      getSQL: (t, n) => `SELECT * FROM \`${t}\` ORDER BY \`${n}\` DESC LIMIT 15;`,
    },
    {
      id: 'limit-offset',
      category: 'Find & Filter',
      name: 'LIMIT & OFFSET',
      syntax: 'LIMIT n OFFSET m',
      description: 'Limit how many rows are shown at once.',
      getSQL: (t) => `SELECT * FROM \`${t}\` LIMIT 10 OFFSET 5;`,
    },

    // Totals & Summaries
    {
      id: 'group-by-count',
      category: 'Totals & Summaries',
      name: 'GROUP BY + COUNT(*)',
      syntax: 'SELECT col, COUNT(*) FROM table GROUP BY col;',
      description: 'Count how many items belong to each category.',
      getSQL: (t, _, c) => `SELECT \`${c}\`, COUNT(*) AS total_count FROM \`${t}\` GROUP BY \`${c}\` ORDER BY total_count DESC;`,
    },
    {
      id: 'group-by-sum',
      category: 'Totals & Summaries',
      name: 'GROUP BY + SUM()',
      syntax: 'SELECT col, SUM(num_col) FROM table GROUP BY col;',
      description: 'Calculate the sum total for each category group.',
      getSQL: (t, n, c) => `SELECT \`${c}\`, SUM(\`${n}\`) AS total_${n} FROM \`${t}\` GROUP BY \`${c}\` ORDER BY total_${n} DESC;`,
    },
    {
      id: 'group-by-avg',
      category: 'Totals & Summaries',
      name: 'GROUP BY + AVG()',
      syntax: 'SELECT col, AVG(num_col) FROM table GROUP BY col;',
      description: 'Calculate the average value for each category group.',
      getSQL: (t, n, c) => `SELECT \`${c}\`, AVG(\`${n}\`) AS avg_${n} FROM \`${t}\` GROUP BY \`${c}\` ORDER BY avg_${n} DESC;`,
    },
    {
      id: 'min-max',
      category: 'Totals & Summaries',
      name: 'MIN() & MAX() Bounds',
      syntax: 'SELECT MIN(col), MAX(col) FROM table;',
      description: 'Find the lowest and highest values in the dataset.',
      getSQL: (t, n, c) => `SELECT \`${c}\`, MIN(\`${n}\`) AS lowest_${n}, MAX(\`${n}\`) AS highest_${n} FROM \`${t}\` GROUP BY \`${c}\`;`,
    },
    {
      id: 'having-clause',
      category: 'Totals & Summaries',
      name: 'HAVING Group Filter',
      syntax: 'GROUP BY col HAVING aggregate_func > val',
      description: 'Filter category totals after calculating sums or averages.',
      getSQL: (t, n, c) => `SELECT \`${c}\`, AVG(\`${n}\`) AS avg_${n} FROM \`${t}\` GROUP BY \`${c}\` HAVING avg_${n} > 50;`,
    },

    // Add & Edit
    {
      id: 'insert-into',
      category: 'Add & Edit',
      name: 'INSERT INTO',
      syntax: 'INSERT INTO table (col1, col2) VALUES (v1, v2);',
      description: 'Add a new row of data to the table.',
      getSQL: (t, n, c) => `INSERT INTO \`${t}\` (\`${c}\`, \`${n}\`) VALUES ('New Entry', 250);`,
    },
    {
      id: 'update-set',
      category: 'Add & Edit',
      name: 'UPDATE ... SET',
      syntax: 'UPDATE table SET col = val WHERE cond;',
      description: 'Change existing values based on specific conditions.',
      getSQL: (t, n, c) => `UPDATE \`${t}\` SET \`${n}\` = \`${n}\` * 1.10 WHERE \`${c}\` = 'Active';`,
    },
    {
      id: 'delete-from',
      category: 'Add & Edit',
      name: 'DELETE FROM',
      syntax: 'DELETE FROM table WHERE cond;',
      description: 'Delete rows that match a specific condition.',
      getSQL: (t, n) => `DELETE FROM \`${t}\` WHERE \`${n}\` < 0;`,
    },

    // Table Structure
    {
      id: 'create-table',
      category: 'Table Structure',
      name: 'CREATE TABLE',
      syntax: 'CREATE TABLE name (col TYPE PRIMARY KEY);',
      description: 'Create a brand new empty data table.',
      getSQL: () => `CREATE TABLE \`custom_analytics\` (\n  \`id\` INT PRIMARY KEY,\n  \`feature_name\` VARCHAR(100),\n  \`metric_value\` FLOAT,\n  \`created_at\` TIMESTAMP\n);`,
    },
    {
      id: 'alter-table',
      category: 'Table Structure',
      name: 'ALTER TABLE',
      syntax: 'ALTER TABLE table ADD COLUMN col TYPE;',
      description: 'Add or modify columns in the existing table.',
      getSQL: (t) => `ALTER TABLE \`${t}\` ADD COLUMN \`updated_timestamp\` TIMESTAMP;`,
    },
    {
      id: 'drop-table',
      category: 'Table Structure',
      name: 'DROP TABLE',
      syntax: 'DROP TABLE table_name;',
      description: 'Completely delete a table and all its data.',
      getSQL: () => `DROP TABLE \`temp_staging_table\`;`,
    },
    {
      id: 'truncate-table',
      category: 'Table Structure',
      name: 'TRUNCATE TABLE',
      syntax: 'TRUNCATE TABLE table_name;',
      description: 'Clear all rows from the table while keeping the table structure.',
      getSQL: (t) => `TRUNCATE TABLE \`${t}\`;`,
    },

    // Combine Tables
    {
      id: 'with-cte',
      category: 'Combine Tables',
      name: 'WITH Sub-Query',
      syntax: 'WITH cte AS (SELECT ...) SELECT * FROM cte;',
      description: 'Create a temporary result block for complex calculations.',
      getSQL: (t, n, c) => `WITH HighValueRecords AS (\n  SELECT * FROM \`${t}\` WHERE \`${n}\` > 50\n)\nSELECT \`${c}\`, COUNT(*) AS count_high\nFROM HighValueRecords\nGROUP BY \`${c}\`;`,
    },
    {
      id: 'union-all',
      category: 'Combine Tables',
      name: 'UNION ALL',
      syntax: 'SELECT ... UNION ALL SELECT ...;',
      description: 'Combine results from multiple searches into one list.',
      getSQL: (t, n, c) => `SELECT \`${c}\`, \`${n}\`, 'Group A' AS batch FROM \`${t}\` WHERE \`${n}\` > 100\nUNION ALL\nSELECT \`${c}\`, \`${n}\`, 'Group B' AS batch FROM \`${t}\` WHERE \`${n}\` <= 100;`,
    },
    {
      id: 'inner-join',
      category: 'Combine Tables',
      name: 'INNER JOIN',
      syntax: 'SELECT * FROM t1 INNER JOIN t2 ON t1.id = t2.id;',
      description: 'Join data from two tables using matching keys.',
      getSQL: (t, _, c) => `SELECT a.\`${c}\`, a.* FROM \`${t}\` a\nINNER JOIN \`${t}\` b ON a.\`${c}\` = b.\`${c}\` LIMIT 20;`,
    },
  ], [tableName, numericCol, catCol]);

  // Filter commands
  const filteredCommands = React.useMemo(() => {
    return sqlCommandsCatalog.filter(cmd => {
      const matchesCategory = selectedCategory === 'All' || cmd.category === selectedCategory;
      const matchesSearch = !commandSearch || 
        cmd.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
        cmd.syntax.toLowerCase().includes(commandSearch.toLowerCase()) ||
        cmd.description.toLowerCase().includes(commandSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [sqlCommandsCatalog, selectedCategory, commandSearch]);

  // Execute SQL Query
  const handleRunSQL = (sqlToRun?: string) => {
    const query = sqlToRun || sqlInput;
    const result = executeSQLQuery(query, tableName, dataset.rows);
    setQueryResult(result);
  };

  // Run initial query on mount or dataset change
  React.useEffect(() => {
    const defaultQuery = `SELECT * FROM \`${tableName}\` LIMIT 25;`;
    setSqlInput(defaultQuery);
    setQueryResult(executeSQLQuery(defaultQuery, tableName, dataset.rows));
  }, [tableName, dataset.rows]);

  // Generate SQL from Natural Language prompt via Gemini API
  const handleGenerateNLSQL = async () => {
    if (!nlPrompt.trim()) return;
    setIsGeneratingSQL(true);
    try {
      const response = await fetch('/api/ai/sql-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naturalLanguageQuery: nlPrompt,
          tableName,
          columns: dataset.columns.map(c => ({ name: c.name, type: c.type })),
        }),
      });

      const data = await response.json();
      if (data.sql) {
        setSqlInput(data.sql);
        handleRunSQL(data.sql);
      }
    } catch (err) {
      console.error('SQL generation error:', err);
    } finally {
      setIsGeneratingSQL(false);
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Natural Language to SQL AI Prompt Bar */}
      <div className="rounded-3xl border border-cyan-200/80 dark:border-cyan-900/60 bg-gradient-to-r from-cyan-900/95 via-slate-900 to-cyan-950 p-6 shadow-xl text-white space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-300 animate-pulse" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-cyan-200">
              Ask AI to Search or Filter Data
            </h2>
          </div>
          <span className="text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
            AI Assistant
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateNLSQL()}
            placeholder='Ask a question in plain English, e.g. "Show me the top 5 regions with highest revenue"'
            className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs text-white placeholder-cyan-200/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            onClick={handleGenerateNLSQL}
            disabled={isGeneratingSQL || !nlPrompt.trim()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white px-5 py-3 text-xs font-bold shadow-lg shadow-cyan-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isGeneratingSQL ? 'Searching...' : 'Ask Question'}</span>
          </button>
        </div>
      </div>

      {/* Interactive SQL Commands Catalog & Workbench Toolbar */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Quick Action Commands
                <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {sqlCommandsCatalog.length} Actions Available
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any action to quickly search, calculate totals, filter, or edit your data.
              </p>
            </div>
          </div>

          {/* Catalog Controls */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Search action or keyword..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <button
              onClick={() => setIsCatalogOpen(!isCatalogOpen)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isCatalogOpen ? 'Hide Actions' : 'Show Actions'}
            </button>
          </div>
        </div>

        {/* Command Category Filters */}
        {isCatalogOpen && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800/60">
              {(['All', 'Find & Filter', 'Totals & Summaries', 'Add & Edit', 'Table Structure', 'Combine Tables'] as CommandCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid of Command Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
              {filteredCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-3.5 hover:border-cyan-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {cmd.name}
                    </span>
                    <span className="text-[10px] font-medium bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900 px-2 py-0.5 rounded-md">
                      {cmd.category.split(' ')[0]}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {cmd.description}
                  </p>

                  <div className="rounded-lg bg-slate-900 p-2 font-mono text-[10px] text-cyan-300 truncate">
                    {cmd.syntax}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const sql = cmd.getSQL(tableName, numericCol, catCol, allColNames);
                        setSqlInput(sql);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Plus className="h-3 w-3 text-cyan-500" /> Insert Code
                    </button>
                    <button
                      onClick={() => {
                        const sql = cmd.getSQL(tableName, numericCol, catCol, allColNames);
                        setSqlInput(sql);
                        handleRunSQL(sql);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 text-[11px] font-bold shadow-2xs transition-colors"
                    >
                      <Zap className="h-3 w-3 fill-white" /> Quick Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SQL Code Workbench Editor */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-cyan-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              SQL Editor & Execution Engine
            </h3>
            <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              Target Table: `{tableName}`
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySQL}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Copy SQL"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>

            <button
              onClick={() => handleRunSQL()}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Execute SQL</span>
            </button>
          </div>
        </div>

        {/* Text Area Code Editor */}
        <div className="relative">
          <textarea
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            rows={6}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 font-mono text-xs text-cyan-300 leading-relaxed focus:outline-none focus:border-cyan-500 shadow-inner"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Query Execution Results */}
      {queryResult && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Execution Results
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  <Clock className="h-3 w-3 text-cyan-500" />
                  {queryResult.executionTimeMs} ms
                </span>
                <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {queryResult.rowCount} rows returned
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={() => setActiveView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'table'
                    ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" /> Table Grid
              </button>
              <button
                onClick={() => setActiveView('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'json'
                    ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" /> Raw JSON
              </button>
            </div>
          </div>

          {queryResult.error ? (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-mono text-rose-700 dark:text-rose-300">
              <b>Execution Error:</b> {queryResult.error}
            </div>
          ) : activeView === 'table' ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] font-bold text-slate-500">
                    {queryResult.columns.map((col, cIdx) => (
                      <th key={`sql-col-${col}-${cIdx}`} className="py-2.5 px-4 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {queryResult.rows.map((row, rIdx) => (
                    <tr key={`sql-row-${rIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                      {queryResult.columns.map((col, cIdx) => (
                        <td key={`sql-cell-${rIdx}-${col}-${cIdx}`} className="py-2 px-4 border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 truncate max-w-[220px]">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 max-h-80 overflow-y-auto">
              {JSON.stringify(queryResult.rows, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
