import React, { useState, useRef, useEffect } from "react";

const SearchableSelect = ({ options = [], value, onChange, placeholder = "Select...", isClearable = true, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find selected option
  const selectedOption = options.find((opt) => opt.value === value) || null;

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

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchTerm("");
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`searchable-select ${className}`} style={{ position: "relative", width: "100%" }}>
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
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{selectedOption ? selectedOption.label : placeholder}</span>
        <span style={{ position: "absolute", right: "10px" }}>
          {isClearable && selectedOption && (
            <span onClick={handleClear} style={{ marginRight: "8px", cursor: "pointer", color: "#999" }}>
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
            maxHeight: "200px",
            overflowY: "auto",
            marginTop: "4px",
          }}
        >
          {/* Search input */}
          <div style={{ padding: "8px" }}>
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          {/* Options list */}
          <ul ref={listRef} style={{ listStyle: "none", margin: 0, padding: 0 }} role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    backgroundColor: index === highlightedIndex ? "#f0f0f0" : selectedOption?.value === option.value ? "#e6f7ff" : "transparent",
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={selectedOption?.value === option.value}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li style={{ padding: "8px 12px", color: "#999" }}>No options found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
