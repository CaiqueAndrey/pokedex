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
            {/* <span>
                <label>Tipo:</label>
                <select onChange={e => searchPokemon('type', e.target.value)}>
                    <option value='' disabled>Selecione um tipo</option>
                    <option value='water'>Água</option>
                    <option value='dragon'>Dragão</option>
                    <option value='eletric'>Elétrico</option>
                    <option value='fairy'>Fada</option>
                    <option value='steel'>Ferro</option>
                    <option value='fire'>Fogo</option>
                    <option value='ice'>Gelo</option>
                    <option value='grass'>Grama</option>
                    <option value='bug'>Inseto</option>
                    <option value='fighting'>Lutador</option>
                    <option value='normal'>Normal</option>
                    <option value='rock'>Pedra</option>
                    <option value='psychic'>Psíquico</option>
                    <option value='ground'>Terra</option>
                    <option value='poison'>Veneno</option>
                    <option value='flying'>Voador</option>
                </select>    
            </span>    */}         
        </Div>
    );
}