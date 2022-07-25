import { useContext } from 'react';
import { CalculatorContext } from '../contexts/CalculatorContext';
import { Card, CardImage, CardSubtitle, CardTitle }  from '../styles/components/Pokemon';

interface PropsPokemon {
    types: any;
    pokemonId: any;
    pokemonName: string;
}

const Pokemon: React.FC<PropsPokemon> = ({types, pokemonId, pokemonName}) => {
    const pokemonType = types.map(typeInfo => typeInfo.type.name)
    // const { actions } = useContext(CalculatorContext);
    const imgUrl = `https://pokeres.bastionbot.org/images/pokemon/${pokemonId}.png`;
    return (
        <Card color={types[0].name}>
            <CardImage src={imgUrl} alt={pokemonName}/>
            <CardTitle>#{pokemonId} - {pokemonName}</CardTitle>
            <CardSubtitle>${pokemonType.join(' e ')}</CardSubtitle>
        </Card>
    );
}

export default Pokemon;