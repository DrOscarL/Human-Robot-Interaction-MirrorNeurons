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
