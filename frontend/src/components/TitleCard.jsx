import { Link } from 'react-router-dom';

const CATEGORY_COLORS = {
  Accion: '#e0576a',
  Comedia: '#e0b04c',
  Drama: '#6aa9e0',
  Terror: '#8a63d2',
  Documental: '#5cc2b4',
  'Ciencia ficcion': '#63a1e0',
  Infantil: '#e08fc0',
  Animacion: '#e08fc0',
  Musical: '#c98fe0',
  Thriller: '#c25b5b',
};

export default function TitleCard({ title }) {
  const color = CATEGORY_COLORS[title.category] || '#8a8fa3';
  return (
    <Link to={`/titulos/${title.id}`} className="title-card" style={{ '--accent': color }}>
      <div className="title-card-thumb">
        <span className="title-card-type">{title.type === 'SERIES' ? 'Serie' : 'Película'}</span>
      </div>
      <div className="title-card-body">
        <h3>{title.name}</h3>
        <p className="title-card-meta">
          {title.category} · {title.ageRating}
        </p>
        <p className="title-card-synopsis">{title.synopsis}</p>
      </div>
    </Link>
  );
}
