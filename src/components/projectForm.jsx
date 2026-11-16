import { useState } from "react";
import locationsData from "../data/location.json";
import { useNavigate } from "react-router-dom";
import { SERVICES, PAID_NOTE } from "../data/services";


// A link such as /?service=architecture#contact preselects the service
function initialService() {
    const s = new URLSearchParams(window.location.search).get("service");
    return SERVICES.some((x) => x.slug === s) ? s : "";
}

export default function ProjectForm() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        UPI: "",
        province: "",
        district: "",
        sector: "",
        service: initialService(),
        projectDetails: "",
        budget: "",
    });
    const [error, setError] = useState("");

    const navigate = useNavigate();
    const selected = SERVICES.find((s) => s.slug === formData.service);

    // Province -> district -> sector: changing one clears the ones below it
    const districts = formData.province ? Object.keys(locationsData[formData.province] || {}) : [];
    const sectors = formData.province && formData.district
        ? [...new Set(locationsData[formData.province]?.[formData.district] || [])]
        : [];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const next = { ...prev, [name]: value };
            if (name === "province") { next.district = ""; next.sector = ""; }
            if (name === "district") { next.sector = ""; }
            return next;
        });
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (!res.ok) {
                let data = {};
                try { data = await res.json(); } catch { /* not JSON, e.g. an error page */ }
                return setError(data.error || `Could not send your project (error ${res.status}). Please try again.`);
            }
            navigate("/thank-you");
        } catch {
            setError("Cannot reach the server. Please try again in a moment.");
        }
    };
    
    return (
        <>
            <div className="project-form" id="project-form">
                <h2>Submit your project</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name">Project owner:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="phone">Telephone contact:</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <h3>Project details</h3>
                    <div>
                        <label htmlFor="service">Service you need:</label>
                        <select
                            id="service"
                            name="service"
                            value={formData.service}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Choose a service</option>
                            {SERVICES.map((s) => (
                                <option key={s.slug} value={s.slug}>
                                    {s.title}{s.paid ? " (paid service)" : ""}
                                </option>
                            ))}
                        </select>
                        {selected?.paid && <p className="paid-note" role="status">{PAID_NOTE}</p>}
                    </div>
                    <div>
                        <label htmlFor="UPI">UPI:</label>
                        <input
                            type="text"
                            id="UPI"
                            name="UPI"
                            value={formData.UPI}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="province">Province:</label>
                        <select id="province" name="province" value={formData.province} onChange={handleChange} required>
                            <option value="">Choose a province</option>
                            {Object.keys(locationsData).map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="district">District:</label>
                        <select
                            id="district"
                            name="district"
                            value={formData.district}
                            onChange={handleChange}
                            required
                            disabled={!formData.province}
                        >
                            <option value="">{formData.province ? "Choose a district" : "Choose a province first"}</option>
                            {districts.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="sector">Sector:</label>
                        <select
                            id="sector"
                            name="sector"
                            value={formData.sector}
                            onChange={handleChange}
                            required
                            disabled={!formData.district}
                        >
                            <option value="">{formData.district ? "Choose a sector" : "Choose a district first"}</option>
                            {sectors.map((x) => (
                                <option key={x} value={x}>{x}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="projectDetails">Describe the project:</label>
                        <textarea
                            id="projectDetails"
                            name="projectDetails"
                            value={formData.projectDetails}
                            onChange={handleChange}
                            required
                        ></textarea>
                    </div>
                    <div>
                        <label htmlFor="budget">Budget (RWF):</label>
                        <input
                            type="number"
                            min="0"
                            id="budget"
                            name="budget"
                            value={formData.budget}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {error && <p className="form-error" role="alert">{error}</p>}
                    <button type="submit" className="btn">Send project</button>
                </form>
            </div>
        </>
    );
}