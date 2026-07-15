# Avatar 2D con Neuronas Espejo

Aplicación web para demostrar, mediante cámara, un sistema de imitación facial basado en una asociación sensoriomotora y una dinámica de población espejo.

La aplicación está organizada en dos vistas:

1. **Interacción**: captura facial, avatar imitativo y activaciones observadas.
2. **Modelo matemático**: vectores, matriz sensoriomotora, error de imitación y evolución del aprendizaje.

## Ejecución

La cámara no funciona correctamente al abrir `index.html` directamente mediante `file://`.

Ejecute un servidor local desde la carpeta del proyecto:

```bash
python -m http.server 8000
```

Luego abra:

```text
http://localhost:8000
```

En GitHub Pages, la aplicación debe funcionar directamente porque el sitio utiliza HTTPS.

## Preparación inicial

Antes de realizar cualquier experimento:

1. Presione **Iniciar cámara**.
2. Autorice el acceso a la cámara.
3. Ubíquese frente a la cámara con buena iluminación.
4. Mantenga el rostro neutral.
5. Presione **Calibrar rostro neutro**.
6. Verifique que aparezca:
   - `Rostro detectado: SÍ`;
   - movimiento de ojos y cabeza;
   - barras de activación facial.

La calibración neutral establece una referencia individual para las distancias faciales. Esto reduce el efecto de diferencias morfológicas entre usuarios.

## Modelo representado

La aplicación implementa:

$$
z[k]=\phi\left(W_{SM}x[k]+b\right)
$$

$$
m[k+1]=(1-\alpha)m[k]+\alpha z[k]
$$

$$
q[k]=Km[k]
$$

$$
\Delta W=\eta\left(m^\ast-z\right)x^\top
$$

donde:

- $x[k]$: vector de gestos faciales observados;
- $z[k]$: activación instantánea de la capa espejo;
- $m[k]$: estado dinámico de la población espejo;
- $q[k]$: salida aplicada al avatar;
- $W_{SM}$: matriz de asociación sensoriomotora;
- $K$: matriz de proyección motora;
- $\alpha$: constante dinámica;
- $\eta$: tasa de aprendizaje.

## Experimento 1: imitación facial directa

### Objetivo

Comprobar que el avatar reproduce deformaciones faciales observables sin clasificar emociones.

### Procedimiento

1. Reinicie el modelo.
2. Calibre el rostro neutral.
3. Realice lentamente los siguientes gestos:
   - sonrisa;
   - descenso de comisuras;
   - parpadeo;
   - apertura amplia de ojos;
   - elevación de cejas;
   - contracción de cejas;
   - apertura de boca;
   - labios fruncidos.
4. Observe:
   - las barras de activación;
   - el vector $x[k]$;
   - el estado espejo $m[k]$;
   - la salida $q[k]$;
   - el movimiento correspondiente en el avatar.

### Resultado esperado

Para un gesto sostenido:

$$
x_i[k] \rightarrow m_i[k] \rightarrow q_i[k]
$$

La respuesta del avatar debe seguir el gesto con un pequeño retardo, determinado por $\alpha$.

## Experimento 2: efecto de la constante dinámica $\alpha$

### Objetivo

Observar cómo cambia la velocidad de respuesta de la población espejo.

### Procedimiento

1. Reinicie el modelo.
2. Mantenga desactivado el aprendizaje.
3. Configure un valor bajo:

$$
\alpha=0.05
$$

4. Abra y cierre la boca varias veces.
5. Observe la respuesta lenta de $m[k]$ y del avatar.
6. Configure un valor mayor:

$$
\alpha=0.35
$$

7. Repita el gesto.

### Interpretación

Un valor pequeño produce una respuesta lenta y suave:

$$
\alpha \downarrow
\Rightarrow
\text{mayor suavizado}
$$

Un valor grande produce una respuesta más rápida:

$$
\alpha \uparrow
\Rightarrow
\text{menor retardo}
$$

Valores demasiado altos pueden producir movimientos visualmente bruscos.

## Experimento 3: perturbación de la matriz sensoriomotora

### Objetivo

Mostrar que la imitación depende de la estructura de $W_{SM}$.

### Procedimiento

1. Reinicie el modelo.
2. Calibre el rostro neutral.
3. Realice una sonrisa sostenida.
4. Observe:
   - error de imitación bajo;
   - asociación diagonal alta;
   - respuesta correcta del avatar.
5. Presione **Perturbar W**.
6. Mantenga la misma sonrisa.
7. Observe:
   - aumento del error;
   - reducción de la asociación diagonal;
   - respuesta incorrecta o mezclada del avatar;
   - cambios en el mapa de calor.

### Interpretación

Antes de perturbar:

$$
W_{SM}\approx I
$$

Después de perturbar:

$$
W_{SM}\neq I
$$

La actividad de un gesto puede propagarse hacia canales motores incorrectos.

## Experimento 4: aprendizaje de una asociación sensoriomotora

### Objetivo

Comprobar que el sistema reduce el error después de perturbar la matriz.

### Procedimiento

1. Reinicie el modelo.
2. Calibre el rostro neutral.
3. Presione **Perturbar W**.
4. Seleccione un gesto sencillo, por ejemplo una sonrisa.
5. Mantenga el gesto durante algunos segundos.
6. Active **Aprendizaje: ON**.
7. Repita el mismo gesto durante 10 a 20 segundos.
8. Observe:
   - aumento de los pasos de aprendizaje;
   - reducción progresiva del error;
   - cambio de la matriz $W_{SM}$;
   - modificación de la asociación diagonal;
   - recuperación gradual de la respuesta del avatar.

### Resultado esperado

Durante el entrenamiento:

$$
\|m^\ast-m\|_2 \downarrow
$$

La asociación correspondiente al gesto entrenado debe fortalecerse.

### Consideración

El aprendizaje es dependiente del gesto observado. Para entrenar distintas columnas de $W_{SM}$, repita el procedimiento con:

- sonrisa;
- apertura de boca;
- parpadeo;
- elevación de cejas;
- labios fruncidos.

## Experimento 5: efecto de la tasa de aprendizaje $\eta$

### Objetivo

Observar cómo $\eta$ modifica la velocidad de adaptación.

### Procedimiento

1. Perturbe la matriz.
2. Seleccione una sonrisa sostenida.
3. Configure:

$$
\eta=0.005
$$

4. Active el aprendizaje y observe la recuperación.
5. Reinicie y vuelva a perturbar.
6. Configure:

$$
\eta=0.050
$$

7. Repita el entrenamiento.

### Interpretación

Una tasa pequeña produce aprendizaje lento:

$$
\eta \downarrow
\Rightarrow
\Delta W \text{ pequeño}
$$

Una tasa mayor produce aprendizaje rápido:

$$
\eta \uparrow
\Rightarrow
\Delta W \text{ grande}
$$

Una tasa excesivamente alta puede producir oscilaciones o asociaciones inestables.

## Experimento 6: comparación entre imitación y autonomía

### Objetivo

Distinguir una conducta reactiva de una conducta autónoma.

### Modo reactivo

1. Desactive **Autonomía**.
2. Realice gestos frente a la cámara.
3. Observe que el avatar responde principalmente a la persona.

En este modo:

$$
q_{\text{final}}\approx q_{\text{espejo}}
$$

### Modo autónomo

1. Active **Autonomía**.
2. Manténgase quieto frente a la cámara.
3. Observe:
   - parpadeos espontáneos;
   - pequeños movimientos de mirada;
   - leves movimientos de cejas;
   - micromovimientos de boca.
4. Salga del campo visual.
5. Observe el comportamiento exploratorio.

La salida combina:

$$
q_{\text{final}}
=
(1-\lambda)q_{\text{espejo}}
+
\lambda q_{\text{autónomo}}
$$

Cuando hay un rostro, la imitación tiene mayor prioridad. Cuando no hay rostro, aumenta la influencia del comportamiento autónomo.

## Experimento 7: pérdida y recuperación del rostro

### Objetivo

Evaluar el comportamiento del sistema cuando se pierde la detección.

### Procedimiento

1. Active la cámara y calibre.
2. Realice un gesto.
3. Salga lentamente del campo visual.
4. Observe:
   - cambio de `Rostro detectado: SÍ` a `NO`;
   - disminución progresiva de $x[k]$;
   - retorno de $m[k]$ y $q[k]$ hacia cero;
   - comportamiento exploratorio si la autonomía está activada.
5. Regrese frente a la cámara.

### Resultado esperado

El sistema debe recuperar el seguimiento sin reiniciar la aplicación.

## Interpretación de la gráfica de entrenamiento

La curva roja representa:

$$
e[k]=\|m^\ast[k]-m[k]\|_2
$$

Valores menores indican una mejor correspondencia entre el gesto objetivo y el estado espejo.

La curva verde representa:

$$
A_D=
\frac{\sum_i |W_{ii}|}
{\sum_i\sum_j |W_{ij}|}
$$

Este indicador mide cuánta magnitud de la matriz está concentrada en la diagonal.

Para una asociación espejo uno a uno:

$$
A_D\rightarrow 1
$$

Después de una perturbación:

$$
A_D\downarrow
$$

Durante un entrenamiento efectivo se espera, en términos generales:

$$
e[k]\downarrow
$$

y una recuperación de las asociaciones relevantes de $W_{SM}$.

Los picos de error también pueden producirse por cambios rápidos de gesto, parpadeos, pérdida del rostro o variaciones en la detección. Por ello, el aprendizaje debe evaluarse manteniendo un gesto durante varios segundos.

## Secuencia sugerida para una demostración en feria

1. Iniciar cámara.
2. Calibrar rostro neutral.
3. Mostrar imitación directa.
4. Abrir la pestaña matemática.
5. Explicar $x[k]$, $m[k]$ y $q[k]$.
6. Mostrar que $W_{SM}$ comienza aproximadamente diagonal.
7. Presionar **Perturbar W**.
8. Mostrar el aumento del error.
9. Activar aprendizaje.
10. Repetir un gesto sostenido.
11. Mostrar la reducción del error.
12. Activar autonomía.
13. Salir del campo visual para mostrar búsqueda y microcomportamientos.

## Controles

| Tecla | Acción |
|---|---|
| `Tab` | Cambiar entre las vistas |
| `L` | Activar o detener aprendizaje |
| `P` | Perturbar $W_{SM}$ |
| `R` | Reiniciar el modelo |
| `C` | Cambiar cámara |
| `A` | Activar o desactivar autonomía |

## Nota conceptual

El sistema representa e imita deformaciones faciales observables. No debe interpretarse como un sistema que determina de manera objetiva el estado emocional interno de la persona.
