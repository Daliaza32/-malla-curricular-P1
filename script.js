document.addEventListener('DOMContentLoaded', () => {
    // Selecciona todos los elementos de los ramos
    const courses = document.querySelectorAll('.course');
    // Selecciona el elemento donde se mostrarán los mensajes de error
    const errorMessageDiv = document.getElementById('errorMessage');

    // Carga los estados de los ramos aprobados desde el almacenamiento local
    loadApprovedCourses();

    // Añade un event listener a cada ramo para manejar el clic
    courses.forEach(course => {
        course.addEventListener('click', () => {
            const courseCode = course.dataset.code; // Obtiene el código del ramo
            const courseName = course.dataset.name; // Obtiene el nombre del ramo

            // Si el ramo ya está aprobado, se permite desaprobarlo.
            // Esto es útil si el usuario se equivoca o quiere resetear.
            if (course.classList.contains('approved')) {
                toggleCourseApproval(courseCode, course);
            } else {
                // Si el ramo no está aprobado, intenta aprobarlo
                tryApproveCourse(courseCode, courseName, course);
            }
        });
    });

    /**
     * Intenta marcar un ramo como aprobado, verificando sus prerrequisitos.
     * Si los requisitos no están cumplidos, muestra un mensaje de error.
     * @param {string} courseCode - El código del ramo a intentar aprobar.
     * @param {string} courseName - El nombre del ramo.
     * @param {HTMLElement} courseElement - El elemento HTML del ramo.
     */
    function tryApproveCourse(courseCode, courseName, courseElement) {
        // Obtiene los prerrequisitos del ramo. Si no hay, es un array vacío.
        const prerequisites = courseElement.dataset.prerequisites ?
                              courseElement.dataset.prerequisites.split(' ') : [];

        // Filtra los prerrequisitos para encontrar cuáles no están aprobados
        const missingPrerequisites = prerequisites.filter(reqCode => {
            const reqElement = document.querySelector(`.course[data-code="${reqCode}"]`);
            // Un requisito falta si el elemento existe y NO tiene la clase 'approved'
            return reqElement && !reqElement.classList.contains('approved');
        });

        // Si hay prerrequisitos faltantes, muestra un mensaje de error
        if (missingPrerequisites.length > 0) {
            // Mapea los códigos de los requisitos faltantes a sus nombres para un mensaje más amigable
            const missingNames = missingPrerequisites.map(reqCode => {
                const reqElement = document.querySelector(`.course[data-code="${reqCode}"]`);
                return reqElement ? reqElement.dataset.name : reqCode; // Usa el nombre si está disponible, si no el código
            });
            showErrorMessage(`No puedes aprobar "${courseName}" porque te faltan los siguientes ramos: ${missingNames.join(', ')}.`);

            // Añade temporalmente la clase 'blocked' para una retroalimentación visual inmediata
            courseElement.classList.add('blocked');
            setTimeout(() => {
                courseElement.classList.remove('blocked'); // Quita la clase después de un breve tiempo
            }, 1000); // 1 segundo de duración del efecto de bloqueo
        } else {
            // Si todos los prerrequisitos están cumplidos, aprueba el ramo
            toggleCourseApproval(courseCode, courseElement);
            hideErrorMessage(); // Oculta cualquier mensaje de error que pudiera estar visible
        }
    }

    /**
     * Alterna el estado de aprobación de un ramo (aprobado/no aprobado) y lo guarda en localStorage.
     * También actualiza los estados de bloqueo de otros ramos.
     * @param {string} courseCode - El código del ramo.
     * @param {HTMLElement} courseElement - El elemento HTML del ramo.
     */
    function toggleCourseApproval(courseCode, courseElement) {
        courseElement.classList.toggle('approved'); // Alterna la clase 'approved' en el elemento HTML
        updateApprovedCoursesInStorage(courseCode, courseElement.classList.contains('approved')); // Guarda el nuevo estado
        updateAllCoursesBlockedState(); // Revisa y actualiza el estado 'blocked' de TODOS los ramos
    }

    /**
     * Actualiza la lista de ramos aprobados en el almacenamiento local del navegador.
     * @param {string} courseCode - El código del ramo a actualizar.
     * @param {boolean} isApproved - True si el ramo está aprobado, false si se desaprobó.
     */
    function updateApprovedCoursesInStorage(courseCode, isApproved) {
        // Obtiene la lista actual de ramos aprobados desde localStorage o inicializa un array vacío
        let approvedCourses = JSON.parse(localStorage.getItem('approvedCourses')) || [];

        if (isApproved) {
            // Si el ramo está siendo aprobado y no está ya en la lista, lo añade
            if (!approvedCourses.includes(courseCode)) {
                approvedCourses.push(courseCode);
            }
        } else {
            // Si el ramo está siendo desaprobado, lo elimina de la lista
            approvedCourses = approvedCourses.filter(code => code !== courseCode);
        }
        // Guarda la lista actualizada de ramos aprobados en localStorage
        localStorage.setItem('approvedCourses', JSON.stringify(approvedCourses));
    }

    /**
     * Carga los estados de aprobación desde el almacenamiento local al inicio y los aplica a los ramos.
     * Luego, actualiza el estado de bloqueo de todos los ramos.
     */
    function loadApprovedCourses() {
        // Obtiene la lista de ramos aprobados al cargar la página
        const approvedCourses = JSON.parse(localStorage.getItem('approvedCourses')) || [];
        courses.forEach(course => {
            const courseCode = course.dataset.code;
            // Si el código del ramo está en la lista de aprobados, le añade la clase 'approved'
            if (approvedCourses.includes(courseCode)) {
                course.classList.add('approved');
            } else {
                // Si no está, se asegura de que no tenga la clase 'approved'
                course.classList.remove('approved');
            }
        });
        // Después de cargar todos los estados de aprobación, recalcula los estados de bloqueo
        updateAllCoursesBlockedState();
    }

    /**
     * Recorre todos los ramos y actualiza su estado visual de "bloqueado"
     * basándose en si sus prerrequisitos están cumplidos o no.
     */
    function updateAllCoursesBlockedState() {
        courses.forEach(course => {
            const courseCode = course.dataset.code;
            const prerequisites = course.dataset.prerequisites ?
                                  course.dataset.prerequisites.split(' ') : [];

            const isApproved = course.classList.contains('approved');
            let isBlocked = false;

            // Un ramo solo puede estar bloqueado si no ha sido aprobado todavía
            if (!isApproved && prerequisites.length > 0) {
                const missingPrerequisites = prerequisites.filter(reqCode => {
                    const reqElement = document.querySelector(`.course[data-code="${reqCode}"]`);
                    return reqElement && !reqElement.classList.contains('approved');
                });
                isBlocked = missingPrerequisites.length > 0;
            }

            // Aplica o remueve la clase 'blocked'
            if (isBlocked) {
                course.classList.add('blocked');
            } else {
                // Importante: un ramo que está aprobado no debe mostrarse como bloqueado
                // Solo removemos 'blocked' si no está aprobado O si ya no cumple las condiciones de bloqueo.
                if (!isApproved) { // Solo si no está aprobado
                    course.classList.remove('blocked');
                }
            }
        });
    }

    /**
     * Muestra un mensaje de error en la interfaz de usuario.
     * El mensaje desaparece automáticamente después de un tiempo.
     * @param {string} message - El texto del mensaje de error a mostrar.
     */
    function showErrorMessage(message) {
        errorMessageDiv.textContent = message; // Establece el texto del mensaje
        errorMessageDiv.classList.add('show'); // Muestra el div (lo hace visible y opaco)
        // Establece un temporizador para ocultar el mensaje después de 5 segundos
        setTimeout(() => {
            hideErrorMessage();
        }, 5000); // 5000 milisegundos = 5 segundos
    }

    /**
     * Oculta el mensaje de error.
     */
    function hideErrorMessage() {
        errorMessageDiv.classList.remove('show'); // Oculta el div (lo hace invisible y transparente)
    }
});
