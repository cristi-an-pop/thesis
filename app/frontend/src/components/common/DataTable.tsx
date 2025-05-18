import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  InputAdornment,
  Typography,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface ColumnDef<T> {
  id: keyof T | string; // Unique identifier for the column
  header: string;       // The column header text
  cell?: (row: T) => React.ReactNode; // Optional custom cell renderer
  sortable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  width?: number;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  
  onRowClick?: (row: T) => void;   // Handler for row clicks
  loading?: boolean;               // Loading state
  error?: string;                  // Error message
  
  pagination?: boolean;            // Whether to enable pagination
  pageSize?: number;               // Items per page
  pageSizeOptions?: number[];      // Available page size options
  
  // Sorting
  defaultSortColumn?: keyof T | string; // Default column to sort by
  defaultSortDirection?: 'asc' | 'desc'; // Default sort direction
  
  // Search
  searchable?: boolean;            // Whether to enable searching
  searchPlaceholder?: string;      // Placeholder for search input
  onSearch?: (term: string) => void; // Custom search handler
  searchBy?: (row: T, term: string) => boolean; // Custom search function
  
  // Empty state
  emptyMessage?: string;           // Message to display when no data
  
  // Styling
  paperProps?: React.ComponentProps<typeof Paper>; // Props for the Paper component
  tableProps?: React.ComponentProps<typeof Table>; // Props for the Table component
}

export function DataTable<T extends object>({
  data,
  columns,
  getRowId,
  onRowClick,
  loading = false,
  error,
  pagination = true,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  defaultSortColumn,
  defaultSortDirection = 'asc',
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  searchBy,
  emptyMessage = 'No data found',
  paperProps,
  tableProps,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [sortBy, setSortBy] = useState<string | keyof T | undefined>(defaultSortColumn);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (column: keyof T | string) => {
    const isAsc = sortBy === column && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortBy(column);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0); // Reset to first page on search
    
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filteredData = [...data];

    // Filter data if searchable and not using external search
    if (searchable && searchTerm && !onSearch) {
      filteredData = filteredData.filter(row => {
        if (searchBy) {
          return searchBy(row, searchTerm);
        }

        // Default search behavior: check if any visible column contains the search term
        return columns.some(column => {
          const columnId = column.id as keyof T;
          const cellValue = row[columnId];
          
          if (cellValue === null || cellValue === undefined) {
            return false;
          }
          
          return String(cellValue).toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }

    // Sort data if sort column specified
    if (sortBy) {
      filteredData.sort((a, b) => {
        const columnId = sortBy as keyof T;
        
        let aValue = a[columnId];
        let bValue = b[columnId];
        
        // Handle undefined values
        if (aValue === undefined) return sortDirection === 'asc' ? -1 : 1;
        if (bValue === undefined) return sortDirection === 'asc' ? 1 : -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        return sortDirection === 'asc' 
          ? (aValue! < bValue! ? -1 : aValue! > bValue! ? 1 : 0)
          : (bValue! < aValue! ? -1 : bValue! > aValue! ? 1 : 0);
      });
    }

    return filteredData;
  }, [data, searchTerm, searchBy, sortBy, sortDirection, columns, onSearch, searchable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    return processedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [processedData, pagination, page, rowsPerPage]);

  // Render content based on state
  const renderContent = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
            <Typography color="error">{error}</Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (processedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
            <Typography color="text.secondary">{emptyMessage}</Typography>
          </TableCell>
        </TableRow>
      );
    }

    return paginatedData.map(row => {
      const rowId = getRowId(row);
      
      return (
        <TableRow 
          key={rowId}
          hover={!!onRowClick}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          sx={{ 
            cursor: onRowClick ? 'pointer' : 'default',
            '&:hover': onRowClick ? { bgcolor: 'rgba(25, 118, 210, 0.08)' } : {}
          }}
        >
          {columns.map(column => {
            const { id, cell, align } = column;
            
            // Use custom cell renderer if provided
            if (cell) {
              return (
                <TableCell key={`${rowId}-${String(id)}`} align={align || 'left'}>
                  {cell(row)}
                </TableCell>
              );
            }
            
            // Otherwise render value directly
            const value = row[id as keyof T];
            return (
              <TableCell key={`${rowId}-${String(id)}`} align={align || 'left'}>
                {value !== undefined && value !== null ? String(value) : ''}
              </TableCell>
            );
          })}
        </TableRow>
      );
    });
  };

  return (
    <Paper {...paperProps} sx={{ width: '100%', overflow: 'hidden', ...(paperProps?.sx || {}) }}>
      {searchable && (
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}
      
      <TableContainer>
        <Table {...tableProps} stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell
                  key={String(column.id)}
                  align={column.align || 'left'}
                  style={{
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    width: column.width,
                  }}
                  sortDirection={sortBy === column.id ? sortDirection : false}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.header}
                    </TableSortLabel>
                  ) : (
                    column.header
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {renderContent()}
          </TableBody>
        </Table>
      </TableContainer>
      
      {pagination && (
        <TablePagination
          rowsPerPageOptions={pageSizeOptions}
          component="div"
          count={processedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </Paper>
  );
}