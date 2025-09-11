"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Errors_1 = __importDefault(require("../utils/Errors"));
const config_json_1 = __importDefault(require("../config/config.json"));
const router = (0, express_1.Router)();
// In-memory config
let config = config_json_1.default;
// --- Helpers ---
const saveConfig = () => {
    fs_1.default.writeFileSync(path_1.default.join(__dirname, "../config/config.json"), JSON.stringify(config, null, 2));
};
const generateRandomTriggers = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const triggers = [];
    let text = "";
    for (let i = 0; i < 4; i++) {
        text += letters[Math.floor(Math.random() * letters.length)];
    }
    triggers.push(text);
    return triggers;
};
const triggersInUse = () => {
    return new Set(Object.values(config.profiles).flatMap((p) => p.triggers));
};
const generateUniqueTriggers = () => {
    const used = triggersInUse();
    let triggers;
    do {
        triggers = generateRandomTriggers();
    } while (triggers.some((t) => used.has(t)));
    return triggers;
};
// --- ROUTES ---
// Get full config
router.get("/", (_req, res) => {
    res.status(200).json(config);
});
// Get single profile
router.get("/:profile", (req, res) => {
    const { profile } = req.params;
    const target = config.profiles[profile];
    if (!target)
        return res.status(404).send((0, Errors_1.default)(404, "Profile not found"));
    res.status(200).json(target);
});
// Create a new profile (with defaults but unique triggers)
router.post("/:profile", (req, res) => {
    const { profile } = req.params;
    if (config.profiles[profile]) {
        return res.status(409).send((0, Errors_1.default)(409, "Profile already exists"));
    }
    const defaultProfile = config.profiles["default"];
    const newProfile = {
        coverts: [...defaultProfile.coverts],
        triggers: generateUniqueTriggers(),
        finalpage: defaultProfile.finalpage,
    };
    config.profiles[profile] = newProfile;
    saveConfig();
    res.status(201).json({
        message: "Profile created with unique triggers",
        profile: newProfile,
    });
});
// Update a single parameter of a profile
router.post("/:profile/:param", (req, res) => {
    const { profile, param } = req.params;
    let { value } = req.body;
    const target = config.profiles[profile];
    if (!target)
        return res.status(404).send((0, Errors_1.default)(404, "Profile not found"));
    if (profile === "default")
        return res.status(403).send((0, Errors_1.default)(403, "Cannot override default profile"));
    switch (param) {
        case "coverts":
        case "triggers":
            // Convert stringified array or comma-separated string to array
            if (typeof value === "string") {
                try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) {
                        value = parsed;
                    }
                    else {
                        value = value.split(",").map((v) => v.trim()).filter(Boolean);
                    }
                }
                catch {
                    value = value.split(",").map((v) => v.trim()).filter(Boolean);
                }
            }
            // If not an array yet, wrap as array
            if (!Array.isArray(value))
                value = [String(value)];
            // Ensure all elements are strings and clean extra quotes
            value = value.map((v) => String(v).replace(/^"(.*)"$/, "$1").trim());
            // Check for duplicate triggers if updating triggers
            if (param === "triggers") {
                const used = triggersInUse();
                target.triggers.forEach((t) => used.delete(t));
                if (value.some((t) => used.has(t))) {
                    return res
                        .status(400)
                        .send((0, Errors_1.default)(400, "Some triggers are already in use by another profile"));
                }
            }
            target[param] = value;
            break;
        case "finalpage":
            if (typeof value !== "string") {
                value = String(value);
            }
            target[param] = value;
            break;
        default:
            return res.status(400).send((0, Errors_1.default)(400, "Invalid parameter"));
    }
    saveConfig();
    res.status(200).json({ message: "Profile updated", profile: target });
});
// Delete a profile
router.delete("/:profile", (req, res) => {
    const { profile } = req.params;
    if (profile === "default")
        return res.status(403).send((0, Errors_1.default)(403, "Cannot delete default profile"));
    if (!config.profiles[profile])
        return res.status(404).send((0, Errors_1.default)(404, "Profile not found"));
    delete config.profiles[profile];
    saveConfig();
    res.status(200).json({ message: "Profile deleted" });
});
// Replace entire config
router.post("/", (req, res) => {
    const newConfig = req.body;
    if (!newConfig.profiles || typeof newConfig.profiles !== "object") {
        return res.status(400).send((0, Errors_1.default)(400, "Invalid config format"));
    }
    // Validate no duplicate triggers in new config
    const allTriggers = Object.values(newConfig.profiles).flatMap((p) => p.triggers);
    const triggerSet = new Set(allTriggers);
    if (triggerSet.size !== allTriggers.length) {
        return res
            .status(400)
            .send((0, Errors_1.default)(400, "Duplicate triggers found in provided config"));
    }
    config = newConfig;
    saveConfig();
    res.status(200).json({ message: "Config replaced successfully" });
});
exports.default = router;
