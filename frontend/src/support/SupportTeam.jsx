import React from "react";
import MainHeader from "../components/MainHeader";
import { FaPhoneAlt, FaEnvelope, FaHeadset, FaBuilding, FaUserShield } from "react-icons/fa";
import "./supportteam.css";

// ─────────────────────────────────────────────────────────────
// Update this array with real contact details when available.
// ─────────────────────────────────────────────────────────────
const TEAM_CARDS = [
  {
    title: "OBPS Support",
    icon: <FaHeadset />,
    variant: "default",
    members: [
      {
        name: "Kamal Ruidas",
        designation: "Software Developer (OBPS)",
        mobile: "+91-6295832115",
        email: "kamal.ruidas@datacoresystems.co.in",
      },
      {
        name: "Rana Mondol",
        designation: "SAP (OBPS)",
        mobile: "+91-8910750025",
        email: "rana.mondal@datacoresystems.co.in",
      },
      {
        name: "Abhinit Anand",
        designation: "Software Developer (OBPS)",
        mobile: null,
        email: "abhinit.anand@datacoresystems.co.in",
      },
    ],
  },

  {
    title: "Escalation Point",
    icon: <FaUserShield />,
    variant: "escalation",
    members: [
      {
        name: "Sujit Kumar Naskar",
        designation: "Additional General Manager, NCM",
        mobile: null,
        email: "Naskar.SujitKumar@grse.co.in",
      },
      {
        name: "Subhas Maji",
        designation: "Additional General Manager, IT",
        mobile: null,
        email: "Maji.Subhas@grse.co.in",
      },
    ],
  },
];

const TeamCard = ({ card }) => {
  const isEscalation = card.variant === "escalation";

  return (
    <div className={`st-card ${isEscalation ? "st-escalation-card" : ""}`}>
      <div className="st-card-top">
        <div className={`st-avatar ${isEscalation ? "st-avatar-escalation" : ""}`}>{card.icon}</div>
        <h3 className="st-card-title">{card.title}</h3>
      </div>

      <div className="st-divider"></div>

      <ul className="st-member-list">
        {card.members.map((m) => (
          <li key={m.name} className="st-member-item">
            <p className="st-member-name">{m.name}</p>
            <p className="st-designation">{m.designation}</p>
            <div className="st-member-contacts">
              {m.mobile && (
                <div className="st-contact-row">
                  <FaPhoneAlt className="st-details-icon" />
                  <span>{m.mobile}</span>
                </div>
              )}
              {m.email && (
                <div className="st-contact-row">
                  <FaEnvelope className="st-details-icon" />
                  <span className="st-email-text">{m.email}</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const SupportTeam = () => {
  return (
    <div className="st-page">
      <MainHeader title="Support Team" />

      <main className="st-main">
        <section className="st-hero">
          <div className="st-hero-icon">
            <FaHeadset />
          </div>
          <h1 className="st-heading">Support Team</h1>
          <p className="st-subtitle">Need any technical assistance? Our support team is always available to help you.</p>
        </section>

        <section className="st-grid">
          {TEAM_CARDS.map((card) => (
            <TeamCard key={card.title} card={card} />
          ))}
        </section>
      </main>

      <footer className="st-footer">
        <p>All Rights Reserved by HSL.</p>
        <p>Version: 1.1.0</p>
        <span className="st-footer-copy">© {new Date().getFullYear()} HSL OVMS Portal</span>
      </footer>
    </div>
  );
};

export default SupportTeam;
