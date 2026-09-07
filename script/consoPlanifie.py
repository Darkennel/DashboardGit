"""
Model exported as python.
Name : Modèle
Group : 
With QGIS : 34004
"""

from qgis.core import QgsProcessing
from qgis.core import QgsProcessingAlgorithm
from qgis.core import QgsProcessingMultiStepFeedback
from qgis.core import QgsProcessingParameterVectorLayer
from qgis.core import QgsProcessingParameterFeatureSink
from qgis.core import QgsCoordinateReferenceSystem
import processing


class Modle(QgsProcessingAlgorithm):

    def initAlgorithm(self, config=None):
        self.addParameter(QgsProcessingParameterVectorLayer('enaf', 'Enaf', types=[QgsProcessing.TypeVectorPolygon], defaultValue=None))
        self.addParameter(QgsProcessingParameterVectorLayer('zonageplu', 'ZonagePlu', types=[QgsProcessing.TypeVectorPolygon], defaultValue=None))
        self.addParameter(QgsProcessingParameterFeatureSink('ExtractionFinal', 'extraction final', type=QgsProcessing.TypeVectorAnyGeometry, createByDefault=True, defaultValue=None))

    def processAlgorithm(self, parameters, context, model_feedback):
        # Use a multi-step feedback, so that individual child algorithm progress reports are adjusted for the
        # overall progress through the model
        feedback = QgsProcessingMultiStepFeedback(10, model_feedback)
        results = {}
        outputs = {}

        # Extraire par expression
        alg_params = {
            'EXPRESSION': ' "EspNAF22_" = \'ENAF\' ',
            'INPUT': parameters['enaf'],
            'OUTPUT': QgsProcessing.TEMPORARY_OUTPUT
        }
        outputs['ExtraireParExpression'] = processing.run('native:extractbyexpression', alg_params, context=context, feedback=feedback, is_child_algorithm=True)

        feedback.setCurrentStep(1)
        if feedback.isCanceled():
            return {}

        # Réparer les géométries
        alg_params = {
            'INPUT': outputs['ExtraireParExpression']['OUTPUT'],
            'METHOD': 1,  # Structure
            'OUTPUT': QgsProcessing.TEMPORARY_OUTPUT
        }
        outputs['RparerLesGomtries'] = processing.run('native:fixgeometries', alg_params, context=context, feedback=feedback, is_child_algorithm=True)

        feedback.setCurrentStep(2)
        if feedback.isCanceled():
            return {}

        # Intersection
        alg_params = {
            'GRID_SIZE': None,
            'INPUT': parameters['zonageplu'],
            'INPUT_FIELDS': ['libelle'],
            'OVERLAY': outputs['RparerLesGomtries']['OUTPUT'],
            'OVERLAY_FIELDS': ['lib_com'],
            'OVERLAY_FIELDS_PREFIX': '',
            'OUTPUT': QgsProcessing.TEMPORARY_OUTPUT
        }
        outputs['Intersection'] = processing.run('native:intersection', alg_params, context=context, feedback=feedback, is_child_algorithm=True)

        feedback.setCurrentStep(3)
        if feedback.isCanceled():
            return {}

        # De morceaux multiples à morceaux uniques
        alg_params = {
            'INPUT': outputs['Intersection']['OUTPUT'],
            'OUTPUT': QgsProcessing.TEMPORARY_OUTPUT
        }
        outputs['DeMorceauxMultiplesMorceauxUniques'] = processing.run('native:multiparttosingleparts', alg_params, context=context, feedback=feedback, is_child_algorithm=True)

        feedback.setCurrentStep(4)
        if feedback.isCanceled():
            return {}

        # Reprojeter vers cc43
        alg_params = {
            'CONVERT_CURVED_GEOMETRIES': False,
            'INPUT': outputs['DeMorceauxMultiplesMorceauxUniques']['OUTPUT'],
            'OPERATION': None,
            'TARGET_CRS': QgsCoordinateReferenceSystem('EPSG:3943'),
            'OUTPUT': QgsProcessing.TEMPORARY_OUTPUT
        }
        outputs['ReprojeterVersCc43'] = processing.run('native:reprojectlayer', alg_params, context=context, feedback=feedback, is_child_algorithm=True)

        feedback.setCurrentStep(5)
        if feedback.isCanceled():
            return {}

        # Calcul du champ Surface en hectare
        alg_params = {
            'FIELD_LENGTH': 0,
            'FIELD_NAME': 'Surf',
            'FIELD_PRECISION': 0,
            'FIELD_TYPE': 0,  # Décimal (double)
            'FORMULA': '$area / 10000',
            'INPUT': outputs['ReprojeterVersCc43']['OUTPUT'],
            'OUTPUT': QgsProcessing.TEMPORARY_OUTPUT
        }
        outputs['CalculDuChampSurfaceEnHectare'] = processing.run('native:fieldcalculator', alg_params, context=context, feedback=feedback, is_child_algorithm=True)

        feedback.setCurrentStep(6)
        if feedback.isCanceled():
            return {}

        # Sélection entités inf 0,01 hec
        alg_params = {
            'EXPRESSION': ' "Surf" <= 0.01',
            'INPUT': outputs['CalculDuChampSurfaceEnHectare']['OUTPUT'],
            'METHOD': 0,  # Créer une nouvelle sélection
        }
        outputs['SlectionEntitsInf001Hec'] = processing.run('qgis:selectbyexpression', alg_params, context=context, feedback=feedback, is_child_algorithm=True)

        feedback.setCurrentStep(7)
        if feedback.isCanceled():
            return {}

        # Extraction petites entités
        alg_params = {
            'EXPRESSION': ' "Surf" <= 0.05',
            'INPUT': outputs['CalculDuChampSurfaceEnHectare']['OUTPUT'],
            'FAIL_OUTPUT': QgsProcessing.TEMPORARY_OUTPUT,
            'OUTPUT': QgsProcessing.TEMPORARY_OUTPUT
        }
        outputs['ExtractionPetitesEntits'] = processing.run('native:extractbyexpression', alg_params, context=context, feedback=feedback, is_child_algorithm=True)

        feedback.setCurrentStep(8)
        if feedback.isCanceled():
            return {}

        # Calcul du champ compacite
        alg_params = {
            'FIELD_LENGTH': 2,
            'FIELD_NAME': 'compacite',
            'FIELD_PRECISION': 3,
            'FIELD_TYPE': 0,  # Décimal (double)
            'FORMULA': '(4 * pi() * $area) / ($perimeter^2)',
            'INPUT': outputs['ExtractionPetitesEntits']['FAIL_OUTPUT'],
            'OUTPUT': QgsProcessing.TEMPORARY_OUTPUT
        }
        outputs['CalculDuChampCompacite'] = processing.run('native:fieldcalculator', alg_params, context=context, feedback=feedback, is_child_algorithm=True)

        feedback.setCurrentStep(9)
        if feedback.isCanceled():
            return {}

        # extraction compacite
        alg_params = {
            'EXPRESSION': '"compacite" > 0.16',
            'INPUT': outputs['CalculDuChampCompacite']['OUTPUT'],
            'OUTPUT': parameters['ExtractionFinal']
        }
        outputs['ExtractionCompacite'] = processing.run('native:extractbyexpression', alg_params, context=context, feedback=feedback, is_child_algorithm=True)
        results['ExtractionFinal'] = outputs['ExtractionCompacite']['OUTPUT']
        return results

    def name(self):
        return 'Modèle'

    def displayName(self):
        return 'Modèle'

    def group(self):
        return ''

    def groupId(self):
        return ''

    def createInstance(self):
        return Modle()
