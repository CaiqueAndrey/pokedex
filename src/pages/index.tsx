import Head from 'next/head';
import { GetServerSideProps } from 'next';

import { DefaultTheme, ThemeProvider } from 'styled-components';
import GlobalStyle from '../styles/globals';
import { CalculatorProvider } from '../contexts/CalculatorContext';
import { Pokedex } from '../components/Pokedex';
import { Header } from '../components/Header';
import { Div } from '../styles/pages/Home';

import themeLight from '../styles/themes/light';


export default function Home() {

  return (
    <CalculatorProvider>
      <ThemeProvider theme={themeLight}>
        <GlobalStyle />
        <Div>
          <Head>
            <title>Pokedéx</title>
          </Head>

          <Header />

          <section>
            <Pokedex/>
          </section>
        </Div>
      </ThemeProvider>
    </CalculatorProvider>
  )
}
