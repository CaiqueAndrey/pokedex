import { useContext } from 'react';
import { PokedexContext } from '../contexts/PokedexContext';
import { Card, CardDescription, CardImage, CardSubtitle, CardTitle }  from '../styles/components/Pokemon';

interface PropsPokemon {
    types: any;
    pokemonId: any;
    pokemonName: string;
}

const Pokemon: React.FC<PropsPokemon> = ({types, pokemonId, pokemonName}) => {
    
    const pokemonType = types ? types.map(typeInfo => typeInfo.type.name) : types
    // console.log('type', types);
    // const { actions } = useContext(CalculatorContext);
    // const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
    const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
    return (
        <Card color={types[0].type.name}>
            <CardImage src={imgUrl} alt={pokemonName}/>
            <CardDescription>
                <CardTitle>#{pokemonId} - {pokemonName}</CardTitle>
                {
                    types.map((typeInfo, index) => {
                        console.log('typeInfo', typeInfo);
                       return <CardSubtitle
                                color={typeInfo.type.name}
                                key={index}>
                                    {typeInfo.type.name}
                                </CardSubtitle>
                    })
                }
            </CardDescription>
        </Card>
    );
}

export default Pokemon;