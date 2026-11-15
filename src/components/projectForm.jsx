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
        location: "",
        service: initialService(),
        projectDetails: "",
        budget: "",
    });
    const [error, setError] = useState("");

    const navigate = useNavigate();
    const selected = SERVICES.find((s) => s.slug === formData.service);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
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
                const data = await res.json();
                return setError(data.error || "Could not send your project. Please try again.");
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
                        <label htmlFor="location">Location:</label>
                        <select
                            id="location"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select a location</option>
                            {Object.entries(locationsData).flatMap(([province, districts]) =>
                                Object.entries(districts).map(([district, sectors]) => (
                                    <optgroup key={`${province}-${district}`} label={`${district}, ${province}`}>
                                        {[...new Set(sectors)].map((sector) => (
                                            <option key={sector} value={`${sector}, ${district}, ${province}`}>
                                                {sector}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))
                            )}
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