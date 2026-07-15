# Avatar 2D · Neuronas Espejo — versión web corregida

Aplicación web estática para GitHub Pages que:

- captura el rostro desde la cámara;
- utiliza MediaPipe Face Mesh;
- sigue la posición del rostro;
- imita sonrisa, descenso de comisuras, parpadeo, apertura ocular, cejas, mandíbula, labios y mejillas;
- muestra los vectores `x[k]`, `m[k]` y `q[k]`;
- visualiza la matriz sensoriomotora `W_SM`;
- permite perturbar la matriz y activar aprendizaje online.

## Ejecución local

La cámara no funciona al abrir `index.html` mediante `file://`.

Ejecute un servidor local:

```bash
python -m http.server 8000
```

Luego abra:

```text
http://localhost:8000
```

## GitHub Pages

1. Suba todos los archivos a la raíz del repositorio.
2. En GitHub vaya a `Settings → Pages`.
3. Seleccione `Deploy from a branch`.
4. Elija la rama `main` y la carpeta `/root`.
5. Abra la URL HTTPS publicada por GitHub Pages.
6. Presione **Iniciar cámara** y acepte el permiso.

## Archivos

```text
index.html
style.css
model.js
avatar.js
charts.js
app.js
README.md
```

## Controles

- `Tab`: cambiar vista.
- `L`: activar o detener aprendizaje.
- `P`: perturbar `W_SM`.
- `R`: reiniciar.
- `C`: cambiar cámara.

## Nota conceptual

La aplicación imita deformaciones faciales observables. No afirma reconocer el estado emocional interno del usuario.


## Cambios de esta versión

- La sonrisa se dibuja con curvas de Bézier y ya no como una elipse.
- La boca abierta conserva las comisuras elevadas.
- Se añadieron dientes, lengua y pliegues laterales.
- Se mejoró el acabado visual del panel del avatar.


## Asociación sensoriomotora mejorada

La matriz `W_SM` ahora tiene una interpretación explícita:

- fila `i`: canal de la población espejo;
- columna `j`: gesto sensorial observado;
- diagonal: asociación gesto → gesto equivalente;
- elementos fuera de la diagonal: asociaciones cruzadas.

Se muestran tres indicadores:

1. error de imitación `||m* - m||`;
2. razón de energía diagonal de `W_SM`;
3. progreso relativo del entrenamiento.

La secuencia docente recomendada es:

1. realizar un gesto;
2. presionar **Perturbar W**;
3. observar el aumento del error y la pérdida de estructura diagonal;
4. activar **Aprendizaje**;
5. repetir el gesto;
6. observar la reducción del error y la recuperación de asociaciones.

## Comportamientos autónomos

El botón **Autonomía** activa microconductas no provocadas directamente por el usuario:

- parpadeos espontáneos;
- exploración visual;
- pequeñas elevaciones de cejas;
- micromovimientos de boca;
- comportamiento de búsqueda cuando no hay rostro.

La autonomía tiene baja influencia cuando existe una persona detectada y aumenta cuando el sistema pierde el rostro.
