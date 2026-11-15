import Header from "../components/header";
import Footer from "../components/footer";
import AboutCompany from "../components/aboutCompany";
import Services from "../components/services";
import Experience from "../components/experiences";
import GetInTouch from "../components/getIntouch";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="wrap">
            <h1>Architectural study and construction, from a team with over 20 years behind it.</h1>
            <p>Our main business is architectural study (architectural design) and construction. We also offer land services, topography and land brokerage. Tell us about your plot and your budget, and our team replies personally.</p>
            <div className="hero-actions">
              <a className="btn" href="#contact">Submit your project</a>
              <a className="btn-link" href="/gallery">See our work</a>
            </div>
          </div>
        </section>
        <AboutCompany />
        <Services />
        <Experience />
        <GetInTouch />
      </main>
      <Footer />
    </>
  );
}
