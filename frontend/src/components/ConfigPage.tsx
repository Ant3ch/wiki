import React, { useEffect, useState } from "react";
import type { error, Config } from "../types/ConfigTypes";
import {HOST} from '../Context/CONSTANT'

const PAGE_TYPES = [
  { label: "WikiPage", value: "wikipage" },
  { label: "DicoPage", value: "dicopage" }
];

const ConfigPage: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string>("default");
  const [editValue, setEditValue] = useState<{ param: string; value: string }>({ param: "", value: "" });
  const [message, setMessage] = useState<string>("");
  const [covertsType, setCovertsType] = useState<"wikipage" | "dicopage">("wikipage");
  const [finalPageType, setFinalPageType] = useState<"wikipage" | "dicopage">("wikipage");
  const [errorObj, setErrorObj] = useState<error | null>(null);

  // Fetch config on mount
  useEffect(() => {
    fetch(`${HOST}/config`)
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => setMessage("Error lors du chargement de la configuration"));
  }, []);

  // Handle profile selection
  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProfile(e.target.value);
    setEditValue({ param: "", value: "" });
    setMessage("");
  };

  // Handle edit input
  const handleEditChange = (param: string, value: string) => {
    setEditValue({ param, value });
  };

  // Submit update
  const handleUpdate = async () => {
    if (!editValue.param || !selectedProfile) return;
    setMessage("Enregistrement...");
    setErrorObj(null);
    try {
      const res = await fetch(`${HOST}/config/${selectedProfile}/${editValue.param}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: editValue.value }),
      });
      if (res.ok) {
        setMessage("Paramètre mis à jour !");
        fetch(`${HOST}/config`)
          .then((r) => r.json())
          .then(setConfig);
      } else {
        const errText = await res.text();
        let parsedError: error;
        try {
          parsedError = JSON.parse(errText);
        } catch {
          parsedError = { code: 0, message: errText };
        }
        setErrorObj(parsedError);
        setMessage(`Error ${parsedError.code} : ${parsedError.message}`);
      }
    } catch (err) {
      setErrorObj({ code: 0, message: String(err) });
      setMessage("Error réseau: " + String(err));
    }
  };

  // Render
  if (!config) return <div className="config-loading">Chargement...</div>;
  const profile = config.profiles[selectedProfile];

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "2rem auto",
        padding: "2rem",
        background: "linear-gradient(135deg, #f8f9fa 60%, #e3e7ef 100%)",
        borderRadius: 16,
        boxShadow: "0 2px 16px 0 rgba(0,0,0,0.07)",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", fontWeight: 700, color: "#2c3e50", marginBottom: "2rem" }}>
        Configuration des profils
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontWeight: 500, color: "#34495e" }}>
          Profil :
        </label>
        <select
          value={selectedProfile}
          onChange={handleProfileChange}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 6,
            border: "1px solid #bfc9d1",
            background: "#fff",
            fontSize: "1rem",
            fontWeight: 500,
            color: "#2c3e50",
          }}
        >
          {Object.keys(config.profiles).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: 32 }}>
        {/* Selector for coverts type */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontWeight: 500, color: "#34495e", marginRight: 8 }}>Type par défaut pour coverts :</label>
          <select
            value={covertsType}
            onChange={e => setCovertsType(e.target.value as "wikipage" | "dicopage")}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 6,
              border: "1px solid #bfc9d1",
              background: "#fff",
              fontSize: "1rem",
              fontWeight: 500,
              color: "#2c3e50",
            }}
          >
            {PAGE_TYPES.map(pt => (
              <option key={pt.value} value={pt.value}>{pt.label}</option>
            ))}
          </select>
        </div>
        <ConfigField
          label="coverts"
          value={editValue.param === "coverts"
            ? editValue.value
            : profile.coverts.map(c => {
                // Show without prefix for editing
                const match = c.match(/^\/(wikipage|dicopage)\/(.+)$/);
                return match ? match[2] : c.replace(/^\//, "");
              }).join(", ")
          }
          onChange={e => handleEditChange("coverts", e.target.value)}
          onUpdate={() => {
            // Add prefix before saving, but keep /dicopage/ if specified
            if (editValue.param === "coverts") {
              const arr = editValue.value.split(",").map(v => v.trim()).filter(Boolean);
              const withPrefix = arr.map(v => {
                if (v.startsWith("/dicopage/") || v.startsWith("dicopage/")) {
                  // Keep as /dicopage/...
                  return v.startsWith("/") ? v : "/" + v;
                }
                if (v.startsWith("/wikipage/") || v.startsWith("wikipage/")) {
                  return v.startsWith("/") ? v : "/" + v;
                }
                // Default to selected type
                return `/${covertsType}/${v.replace(/^\/?(wikipage|dicopage)\//, "")}`;
              });
              setEditValue({ param: "coverts", value: withPrefix.join(", ") });
            }
            handleUpdate();
          }}
          disabled={selectedProfile === "default"}
          active={editValue.param === "coverts"}
        />
        {/* Selector for finalpage type */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontWeight: 500, color: "#34495e", marginRight: 8 }}>Type pour finalpage :</label>
          <select
            value={finalPageType}
            onChange={e => setFinalPageType(e.target.value as "wikipage" | "dicopage")}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 6,
              border: "1px solid #bfc9d1",
              background: "#fff",
              fontSize: "1rem",
              fontWeight: 500,
              color: "#2c3e50",
            }}
          >
            {PAGE_TYPES.map(pt => (
              <option key={pt.value} value={pt.value}>{pt.label}</option>
            ))}
          </select>
        </div>
        <ConfigField
          label="finalpage"
          value={editValue.param === "finalpage"
            ? editValue.value
            : (profile.finalpage
                ? profile.finalpage.replace(/^\/?(wikipage|dicopage)\//, "")
                : "")
          }
          onChange={e => handleEditChange("finalpage", e.target.value)}
          onUpdate={() => {
            // Add prefix before saving, but keep /dicopage/ if specified
            if (editValue.param === "finalpage") {
              let val = editValue.value.trim();
              if (val.toLowerCase().startsWith("/dicopage/") || val.toLowerCase().startsWith("dicopage/")) {
                val = val.startsWith("/") ? val : "/" + val;
              } else if (val.startsWith("/wikipage/") || val.startsWith("wikipage/")) {
                val = val.startsWith("/") ? val : "/" + val;
              } else {
                val = `/${finalPageType}/${val.replace(/^\/?(wikipage|dicopage)\//, "")}`;
              }
              setEditValue({ param: "finalpage", value: val });
            }
            handleUpdate();
          }}
          disabled={selectedProfile === "default"}
          active={editValue.param === "finalpage"}
        />
        <ConfigField
          label="triggers"
          value={editValue.param === "triggers" ? editValue.value : profile.triggers.join(", ")}
          onChange={e => handleEditChange("triggers", e.target.value)}
          onUpdate={handleUpdate}
          disabled={selectedProfile === "default"}
          active={editValue.param === "triggers"}
        />
      </div>
      {message && (
        <div
          style={{
            marginTop: 24,
            color: errorObj ? "#e74c3c" : "#007bff",
            background: errorObj ? "#ffeaea" : "#eaf4ff",
            borderRadius: 6,
            padding: "0.75rem 1rem",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {message}
        </div>
      )}
      <div style={{ marginTop: 40, borderTop: "1px solid #e3e7ef", paddingTop: 24 }}>
        <h3 style={{ fontWeight: 600, color: "#2c3e50" }}>Créer un nouveau profil</h3>
        <form
          style={{ display: "flex", gap: 12, alignItems: "center" }}
          onSubmit={async (e) => {
            e.preventDefault();
            const name = (e.target as any).profileName.value.trim();
            if (!name) return;
            setMessage("Création...");
            const res = await fetch(`${HOST}/config/${name}`, { method: "POST" });
            if (res.ok) {
              setMessage("Profil créé !");
              fetch(`${HOST}/config`)
                .then((r) => r.json())
                .then(setConfig);
            } else {
              const err = await res.text();
              let parsedError: error;
              try {
                parsedError = JSON.parse(err);
              } catch {
                parsedError = { code: 0, message: err };
              }
              setErrorObj(parsedError);
              setMessage(`Error ${parsedError.code} : ${parsedError.message}`);
            }
          }}
        >
          <input
            name="profileName"
            type="text"
            placeholder="Nom du profil"
            style={{
              width: "60%",
              padding: "0.5rem 1rem",
              borderRadius: 6,
              border: "1px solid #bfc9d1",
              fontSize: "1rem",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: 6,
              background: "#007bff",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)",
            }}
          >
            Créer
          </button>
        </form>
      </div>
      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontWeight: 600, color: "#2c3e50" }}>Supprimer le profil</h3>
        <button
          onClick={async () => {
            if (selectedProfile === "default") return;
            setMessage("Suppression...");
            const res = await fetch(`${HOST}/config/${selectedProfile}`, { method: "DELETE" });
            if (res.ok) {
              setMessage("Profil supprimé !");
              fetch(`${HOST}/config`)
                .then((r) => r.json())
                .then(setConfig);
              setSelectedProfile("default");
            } else {
              const err = await res.text();
              let parsedError: error;
              try {
                parsedError = JSON.parse(err);
              } catch {
                parsedError = { code: 0, message: err };
              }
              setErrorObj(parsedError);
              setMessage(`Error ${parsedError.code} : ${parsedError.message}`);
            }
          }}
          style={{
            borderRadius: 6,
            background: selectedProfile === "default" ? "#bfc9d1" : "#e74c3c",
            color: "#fff",
            fontWeight: 600,
            border: "none",
            cursor: selectedProfile === "default" ? "not-allowed" : "pointer",
            boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)",
          }}
          disabled={selectedProfile === "default"}
        >
          Supprimer
        </button>
      </div>
    </div>
  );
};

// Field component for better style and reuse
const ConfigField: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdate: () => void;
  disabled: boolean;
  active: boolean;
}> = ({ label, value, onChange, onUpdate, disabled, active }) => (
  <div style={{ marginBottom: 24 }}>
    <label style={{ fontWeight: 500, color: "#34495e", marginBottom: 8, display: "block" }}>
      {label}
    </label>
    <div style={{ display: "flex", gap: 12 }}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          padding: "0.5rem 1rem",
          borderRadius: 6,
          border: "1px solid #bfc9d1",
          fontSize: "1rem",
          background: disabled ? "#f3f3f3" : "#fff",
          color: "#2c3e50",
        }}
        disabled={disabled}
      />
      <button
        onClick={onUpdate}
        disabled={disabled || !active}
        style={{
          padding: "0.5rem 1.5rem",
          borderRadius: 6,
          background: disabled || !active ? "#bfc9d1" : "#27ae60",
          color: "#fff",
          fontWeight: 600,
          border: "none",
          cursor: disabled || !active ? "not-allowed" : "pointer",
          boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)",
        }}
      >
        Modifier
      </button>
    </div>
  </div>
);

export default ConfigPage;
