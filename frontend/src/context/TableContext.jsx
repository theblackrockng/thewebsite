import { createContext, useContext, useState } from "react";

const TableContext = createContext({
  tableNumber: null,
  tableValid: false,
  setTable: () => {},
  clearTable: () => {},
});

export function TableProvider({ children }) {
  const [tableNumber, setTableNumberState] = useState(() => {
    try {
      const stored = sessionStorage.getItem("br_table");
      return stored ? parseInt(stored, 10) : null;
    } catch { return null; }
  });

  const [tableValid, setTableValidState] = useState(() => {
    try { return !!sessionStorage.getItem("br_table"); } catch { return false; }
  });

  function setTable(num) {
    const n = parseInt(num, 10);
    setTableNumberState(n);
    setTableValidState(true);
    try { sessionStorage.setItem("br_table", String(n)); } catch {}
  }

  function clearTable() {
    setTableNumberState(null);
    setTableValidState(false);
    try { sessionStorage.removeItem("br_table"); } catch {}
  }

  return (
    <TableContext.Provider value={{ tableNumber, tableValid, setTable, clearTable }}>
      {children}
    </TableContext.Provider>
  );
}

export function useTable() {
  return useContext(TableContext);
}
