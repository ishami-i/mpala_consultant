import { React } from "react";
import { useState } from "react";
// import locations from "../data/locations.json";
import locationsData from "../data/locations.json";
import { useNavigate } from "react-router-dom";


export default function ProjectForm() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        projectDetails: "",
    });

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        // Here you can handle the form submission, e.g., send the data to a server or API
        console.log("Form submitted:", formData);
        // After submission, navigate to a thank you page or reset the form
        navigate("/thank-you");
    };
    
    return (
        <>
            <div className="project-form">
                <h2>Submit Your Project</h2>
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
                        <textarea
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        ></textarea>
                    </div>
                    <h3>Project Details</h3>
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
                            {locationsData.map((location) => (
                                <option key={location.id} value={location.name}>
                                    {location.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="projectDetails">Project Details:</label>
                        <textarea
                            id="projectDetails"
                            name="projectDetails"
                            value={formData.projectDetails}
                            onChange={handleChange}
                            required
                        ></textarea>
                    </div>
                    <div>
                        <label htmlFor="budget">Budget:</label>
                        <input
                            type="number"
                            id="budget"
                            name="budget"
                            value={formData.budget}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit">Submit</button>
                </form>
            </div>
        </>
    );
}