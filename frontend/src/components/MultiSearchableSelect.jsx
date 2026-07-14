import React, { useState, useRef, useEffect } from "react";

const MultiSearchableSelect = ({ options = [], value = [], onChange, placeholder = "Select...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setSearchTerm("");
  };

  const handleSelect = (option) => {
    const isSelected = value.some((item) => item.value === option.value);
    let newValue;
    if (isSelected) {
      newValue = value.filter((item) => item.value !== option.value);
    } else {
      newValue = [...value, option];
    }
    onChange(newValue);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = value.map((v) => v.label).join(", ");

  return (
    <div ref={containerRef} className={`multi-searchable-select ${className}`} style={{ position: "relative", width: "100%" }}>
      {/* Display area */}
      <div
        className="form-select"
        onClick={handleToggle}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          paddingRight: "30px",
          position: "relative",
          minHeight: "38px",
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value.length > 0 ? selectedLabels : placeholder}
        </span>
        <span style={{ position: "absolute", right: "10px" }}>
          {value.length > 0 && (
            <span onClick={handleClearAll} style={{ marginRight: "8px", cursor: "pointer", color: "#999" }}>
              ✕
            </span>
          )}
          <span style={{ color: "#666" }}>▼</span>
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            maxHeight: "250px",
            overflowY: "auto",
            marginTop: "4px",
          }}
        >
          {/* Search input */}
          <div style={{ padding: "8px" }}>
            <input ref={inputRef} type="text" className="form-control" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
          </div>
          {/* Options list */}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = value.some((v) => v.value === option.value);
                return (
                  <li
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: isSelected ? "#e6f7ff" : "transparent",
                    }}
                  >
                    <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ marginRight: "8px" }} />
                    {option.label}
                  </li>
                );
              })
            ) : (
              <li style={{ padding: "8px 12px", color: "#999" }}>No options found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MultiSearchableSelect;
