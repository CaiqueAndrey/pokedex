import Head from 'next/head';
import { GetServerSideProps } from 'next';

import { DefaultTheme, ThemeProvider } from 'styled-components';
import GlobalStyle from '../styles/globals';
import { PokedexProvider } from '../contexts/PokedexContext';
import { Pokedex } from '../components/Pokedex';
import { Header } from '../components/Header';
import { Div } from '../styles/pages/Home';

import themeLight from '../styles/themes/light';
import { Footer } from '../components/Footer';


export default function Home() {

  return (
    <PokedexProvider>
      <ThemeProvider theme={themeLight}>
        <GlobalStyle />
        <Div>
          <Head>
            <title>Pokedéx</title>
          </Head>

          <Header />
          <Pokedex/>
          <Footer />
        </Div>
      </ThemeProvider>
    </PokedexProvider>
  )
}
