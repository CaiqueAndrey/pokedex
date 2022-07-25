/* eslint-disable @next/next/no-img-element */
import { useContext } from 'react';
import { Div } from '../styles/components/Header';
import Switch from 'react-switch';
import {shade} from 'polished';
import { ThemeContext } from 'styled-components';

interface HeaderProps {
    toggleTheme(): void;
}

export function Header() {
    const { colors, title } = useContext(ThemeContext);

    return (
        <Div>
            <span>
                {/* <img src='img/pokebola.png' /> */}
                    {/* <a href="https://www.flaticon.com/br/icones-gratis/pokemon" title="pokémon ícones">Pokémon ícones criados por Those Icons - Flaticon</a> */}
                <strong>Pokédex</strong>
            </span>

            {/* <Switch 
                onChange={toggleTheme}
                checked={title === 'dark'}
                checkedIcon={false}
                uncheckedIcon={false}
                height={10}
                width={30}
                handleDiameter={20}
                offColor={shade(0.15, colors.background)}
                onColor={colors.background}
            
            /> */}
            
        </Div>
    );
}