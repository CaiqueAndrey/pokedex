/* eslint-disable @next/next/no-img-element */
import { useContext } from 'react';
import { Div } from '../styles/components/Footer';
import Switch from 'react-switch';
import {shade} from 'polished';
import { ThemeContext } from 'styled-components';

interface HeaderProps {
    toggleTheme(): void;
}

export function Footer() {
    return (
        <Div>
            <span>
                <p>Todos os direitos reservados a <img src="img/pokemon.png" alt="logo-pokemon"></img></p>
            </span>           
        </Div>
    );
}