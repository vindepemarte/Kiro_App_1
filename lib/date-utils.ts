// Safe date formatting utilities to prevent hydration errors

// Safe date formatting that works consistently on server and client
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Use a consistent format that works on both server and client
    if (options) {
      return dateObj.toLocaleDateString("en-US", options);
    }
    
    // Default format that's consistent
    return dateObj.toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return "Invalid date";
  }
}

// Safe short date formatting
export function formatShortDate(date: Date | string): string {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("en-US", {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return "Invalid date";
  }
}

// Safe long date formatting
export function formatLongDate(date: Date | string): string {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

// Safe relative date formatting (e.g., "2 days ago")
export function formatRelativeDate(date: Date | string): string {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
    } else {
      return formatShortDate(dateObj);
    }
  } catch {
    return "Invalid date";
  }
}



// Safe month comparison for filtering
export function isSameMonth(date1: Date | string, date2: Date | string): boolean {
  try {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    return d1.getFullYear() === d2.getFullYear() && 
           d1.getMonth() === d2.getMonth();
  } catch {
    return false;
  }
}