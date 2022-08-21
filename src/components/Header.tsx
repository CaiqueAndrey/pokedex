/* eslint-disable @next/next/no-img-element */
import { useContext } from 'react';
import { PokedexContext } from '../contexts/PokedexContext';
import { Div } from '../styles/components/Header';

export function Header() {
    const { pokemons, searchPokemon } = useContext(PokedexContext);

    return (
        <Div>
            <span>
                <strong>Pokédex</strong>
                <input 
                    className='search' 
                    type='search' 
                    placeholder='Search the pokémon...' 
                    disabled={pokemons.length === 0}
                    onChange={e => searchPokemon(e.target.value)} 
                />
                {/* <button type='button' disabled={pokemons.length === 0}>Search</button> */}
            </span>            
        </Div>
    );
}