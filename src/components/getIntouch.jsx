import ProjectForm from "./projectForm";
import { contact } from "../data/contact";

export default function GetInTouch() {
  const links = [
    contact.email && { label: "Email", href: `mailto:${contact.email}`, text: contact.email },
    contact.phone && { label: "Phone", href: `tel:${contact.phone.replace(/\s/g, "")}`, text: contact.phone },
    contact.whatsapp && { label: "WhatsApp", href: `https://wa.me/${contact.whatsapp}`, text: "Message us" },
    contact.youtube && { label: "YouTube", href: contact.youtube, text: "Watch our videos" },
    contact.linkedin && { label: "LinkedIn", href: contact.linkedin, text: "Follow" },
    contact.facebook && { label: "Facebook", href: contact.facebook, text: "Follow" },
    contact.twitter && { label: "Twitter", href: contact.twitter, text: "Follow" },
  ].filter(Boolean);

  return (
    <section id="contact" className="band alt">
      <div className="wrap split">
        <div>
          <h2>Tell us about your project</h2>
          <p>Fill in the form and we will contact you. You will also get a confirmation email.</p>
          {links.length > 0 && (
            <ul className="contact-links">
              {links.map((l) => (
                <li key={l.label}>
                  <span>{l.label}</span>
                  <a href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{l.text}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ProjectForm />
      </div>
    </section>
  );
}
