import { company } from "../data/company";

export default function Experience() {
  return (
    <section id="experience" className="band">
      <div className="wrap split">
        <div>
          <p className="big-number">{company.yearsExperience}</p>
          <p className="big-label">years in the business</p>
        </div>
        <div>
          <h2>Our experience</h2>
          <p>
            Our team has worked for over two decades across construction, architectural studies, land services and consultancy. That time has taught us how to avoid problems before they cost our clients money.
          </p>
          <p>
            From the first land check to the finished work, you deal with people who have done it many times.
          </p>
        </div>
      </div>
    </section>
  );
}
