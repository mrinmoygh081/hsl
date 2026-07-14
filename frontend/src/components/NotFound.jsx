import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // For navigation
import errorImage from "../images/licensed-image (1).png"; // Ensure the path is correct

const NotFound = () => {
  const [show404, setShow404] = useState(true);
  const [elements, setElements] = useState([]);
  const navigate = useNavigate();

  const goHome = () => {
    navigate("/"); // Navigate to the home page
  };

  // Function to randomly position elements
  const randomizeElements = () => {
    const newElements = elements.map((element) => ({
      ...element,
      style: {
        left: `${Math.random() * 90}%`,
        top: `${Math.random() * 90}%`,
        animationDelay: `${Math.random() * 2}s`,
      },
    }));
    setElements(newElements);
  };

  useEffect(() => {
    // Create multiple 404 and emoji elements on mount
    const newElements = [];
    for (let i = 0; i < 20; i++) {
      newElements.push({
        id: i,
        text: i % 2 === 0 ? "404" : "😔", // Alternate between 404 and emoji
        style: {
          left: `${Math.random() * 90}%`,
          top: `${Math.random() * 90}%`,
          animationDelay: `${Math.random() * 2}s`,
        },
      });
    }
    setElements(newElements);

    // Set a timer to remove them after 30 seconds
    const timer = setTimeout(() => {
      setShow404(false);
    }, 30000); // 30 seconds

    return () => clearTimeout(timer); // Clean up the timer on unmount
  }, []);

  // Handle mouse move to trigger random repositioning
  const handleMouseMove = () => {
    randomizeElements(); // Reposition elements randomly on mouse move
  };

  return (
    <div
      className="page-not-found-container"
      onMouseMove={handleMouseMove} // Add mouse move event
    >
      {show404 &&
        elements.map((element) => (
          <div
            key={element.id}
            className="floating-element"
            style={element.style}
          >
            {element.text}
          </div>
        ))}
      <div className="content-wrapper">
        <div className="error-text">
          <h1>Oops!</h1>
          <p>We can’t seem to find the page you’re looking for.</p>
          <p className="error-code">Error code: 404</p>
          <button className="home-button" onClick={goHome}>
            Back to Home
          </button>
        </div>
        <div className="error-image">
          <img src={errorImage} alt="Error 404" />
        </div>
      </div>
    </div>
  );
};

export default NotFound;
