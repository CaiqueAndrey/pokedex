import { useEffect, useState } from 'react';
import { Div } from '../styles/components/Pokedex';
import Pokemon from './Pokemon';

export function Pokedex() {

    const [pokemons, setPokemons] = useState([]);
    const [loading, setLoading] = useState(false);

    const types = [{type:{name:'fire'}},{type:{name:'water'}},{type:{name:'grass'}}];

    useEffect(()=> {
        const getPokemons = async (id: number) => {
            setLoading(true);
            try {
                let response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
                let pokemon = await response.json();
                
                return setPokemons(oldPokemons => {

                    return [pokemon, ...oldPokemons].sort((a,b)=> a.id-b.id);
                });
              } catch (error) {
                console.log(error);
              }
        }

        for (let index = 1; index <= 150; index+= 1) {
            getPokemons(index);
            if(index === 150){
                
                setLoading(false);
            }
        }
    }, []);

    return (
        <>
            <Div>
                <>
                    { loading && <div>Carregando...</div> }
                    {
                        pokemons.length > 0 &&
                        pokemons.map((pokemon, index) => {
                            
                            return (
                                <Pokemon 
                                types={pokemon.types}
                                pokemonId={pokemon.id}
                                pokemonName={pokemon.name}
                                key={index}
                                    />
                            )
                        })
                    }
                </>
                
            </Div>
        </>
    );
}