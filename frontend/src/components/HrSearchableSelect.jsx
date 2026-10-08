import React, { useState, useRef, useEffect } from "react";

const HrSearchableSelect = ({ options = [], value, onChange, placeholder = "Select...", isClearable = true, className = "", isDisabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null); // ← NEW: dropdown scroll control ke liye
  const listRef = useRef(null);

  const selectedOption =
    options.find(
      (opt) =>
        opt.value === value ||
        (value && opt.value && String(opt.value).trim() === String(value).trim()) ||
        (value && opt.value && !isNaN(Number(opt.value)) && !isNaN(Number(value)) && Number(opt.value) === Number(value))
    ) || null;

  const filteredOptions = options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  // Click outside close
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

  // 🔥 NEW: Search karte hi scroll top pe jaaye + first result highlight
  useEffect(() => {
    if (dropdownRef.current) {
      dropdownRef.current.scrollTop = 0;
    }
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [searchTerm]);

  const handleToggle = () => {
    if (!isDisabled) {
      setIsOpen(!isOpen);
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
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
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
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
      {/* Trigger */}
      <div
        className="form-select"
        onClick={handleToggle}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: isDisabled ? "not-allowed" : "pointer",
          paddingRight: "30px",
          backgroundColor: isDisabled ? "#e9ecef" : "#fff",
        }}
        role="combobox"
        aria-expanded={isOpen}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedOption ? selectedOption.label : value ? `Officer (${value})` : placeholder}
        </span>
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
      {isOpen && !isDisabled && (
        <div
          ref={dropdownRef} // ← yeh ref important hai
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 9999, // ← increased (page ke buttons ke peeche nahi jayega)
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            maxHeight: "300px", // ← badhaya hai (ab zyada options dikhega)
            overflowY: "auto",
            marginTop: "4px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)", // better look
          }}
        >
          {/* Search bar - ab sticky rahega */}
          <div
            style={{
              position: "sticky",
              top: 0,
              background: "white",
              zIndex: 10,
              padding: "8px",
              borderBottom: "1px solid #eee",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {/* Options List */}
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
              <li style={{ padding: "12px", color: "#999", textAlign: "center" }}>No options found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HrSearchableSelect;
